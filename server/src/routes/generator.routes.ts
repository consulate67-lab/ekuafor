import { Router, Request, Response } from 'express';
import axios from 'axios';
import pool from '../config/database';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';

const router = Router();

/**
 * Reverse geocode using Nominatim (OSM)
 * To follow OSM usage policy, we should use this sparingly or with delays
 */
async function reverseGeocode(lat: number, lon: number) {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                format: 'json',
                lat,
                lon,
                zoom: 18,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'EkuaforSalonGenerator/1.0'
            }
        });
        return response.data;
    } catch (error) {
        console.error('[Nominatim] Error:', error);
        return null;
    }
}

/**
 * GET /api/maps/overpass
 * Fetch salon data from OpenStreetMap via Overpass API
 */
router.get('/overpass', authMiddleware, roleCheck(['super_admin', 'company_admin']), async (req: Request, res: Response) => {
    try {
        const { city, district } = req.query;

        // Define tags we're interested in
        const tags = ['hairdresser', 'beauty_shop'];
        const tagQueries = tags.map(tag => `node["shop"="${tag}"](area.searchArea);way["shop"="${tag}"](area.searchArea);relation["shop"="${tag}"](area.searchArea);`).join('');

        // Build OSM search area
        let areaSearch = '';
        if (city && district) {
            areaSearch = `area["name"="${city}"]["admin_level"="4"]->.cityArea; area["name"="${district}"]["admin_level"~"6|8"](area.cityArea)->.searchArea;`;
        } else if (city) {
            areaSearch = `area["name"="${city}"]["admin_level"="4"]->.searchArea;`;
        } else {
            areaSearch = `area["name"="Türkiye"]["admin_level"="2"]->.searchArea;`;
        }

        const overpassQuery = `
            [out:json][timeout:90];
            ${areaSearch}
            (
              ${tagQueries}
            );
            out body;
            >;
            out skel qt;
        `;

        console.log('[Overpass] Querying with area:', city, district);

        const response = await axios.post('https://overpass-api.de/api/interpreter',
            `data=${encodeURIComponent(overpassQuery)}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (!response.data || !response.data.elements) {
            return res.json({ success: true, count: 0, data: [] });
        }

        const elements = response.data.elements.filter((el: any) => el.tags && el.tags.name);

        const salons = elements.map((el: any) => {
            const tags = el.tags || {};

            // Try to find city/district from various OSM tags
            const osmCity = tags['addr:city'] || tags['addr:province'] || tags['addr:state'] || city || '';
            const osmDistrict = tags['addr:district'] || tags['addr:suburb'] || tags['addr:town'] || tags['addr:quarter'] || tags['addr:neighbourhood'] || district || '';

            // Format phone numbers
            let phone = tags['phone'] || tags['contact:phone'] || tags['mobile'] || '';
            if (phone && !phone.startsWith('+') && !phone.startsWith('0')) {
                // Heuristic for Turkish numbers if leading zero is missing
                if (phone.length === 10) phone = '0' + phone;
            }

            return {
                osm_id: el.id,
                name: tags.name,
                type: tags.shop === 'hairdresser' ? 'Kuaför/Berber' : 'Güzellik Salonu',
                phone: phone,
                website: tags['website'] || tags['contact:website'] || tags['facebook'] || '',
                address: tags['addr:full'] ||
                    `${tags['addr:street'] || ''} ${tags['addr:housenumber'] || ''} ${tags['addr:suburb'] || ''} ${tags['addr:district'] || ''} ${tags['addr:city'] || ''}`.trim(),
                city: osmCity,
                district: osmDistrict,
                lat: el.lat || (el.center ? el.center.lat : null),
                lon: el.lon || (el.center ? el.center.lon : null),
                tags: tags
            };
        });

        res.json({
            success: true,
            count: salons.length,
            data: salons
        });
    } catch (error: any) {
        console.error('[Overpass] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'OSM verisi çekilirken hata oluştu',
            details: error.message
        });
    }
});

/**
 * GET /api/generator/resolve-address
 * Resolve full address components from coordinates using Nominatim
 */
router.get('/resolve-address', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) return res.status(400).json({ success: false, error: 'Lat and Lon are required' });

        const data = await reverseGeocode(parseFloat(lat as string), parseFloat(lon as string));
        if (!data) return res.status(404).json({ success: false, error: 'Address not found' });

        const addr = data.address;
        res.json({
            success: true,
            data: {
                city: addr.province || addr.city || addr.state || '',
                district: addr.city_district || addr.district || addr.town || addr.borough || '',
                neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || addr.village || '',
                street: addr.road || '',
                full_address: data.display_name
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/generator/update-existing-companies
 * Updates all existing companies that have coordinates but missing city/district info
 */
router.post('/update-existing-companies', authMiddleware, roleCheck(['super_admin', 'company_admin']), async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        // Find companies with coordinates but missing detailed address info
        const result = await client.query(`
            SELECT id, latitude, longitude, name, address_line 
            FROM companies 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
            AND (
                city IS NULL OR city = '' OR 
                district IS NULL OR district = '' OR 
                province_name IS NULL OR province_name = '' OR
                district_name IS NULL OR district_name = '' OR
                neighborhood_name IS NULL OR neighborhood_name = ''
            )
            LIMIT 50
        `);

        console.log(`[Batch Update] Found ${result.rows.length} companies to update`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const company of result.rows) {
            try {
                const geocode = await reverseGeocode(company.latitude, company.longitude);
                if (geocode && geocode.address) {
                    const addr = geocode.address;
                    const city = addr.province || addr.city || addr.state || '';
                    const district = addr.city_district || addr.district || addr.town || addr.borough || addr.suburb || '';
                    const neighborhood = addr.neighbourhood || addr.quarter || addr.suburb || addr.village || '';

                    // Truncate to 250 characters to avoid potential DB constraints
                    const finalAddress = (company.address_line || geocode.display_name || '').substring(0, 250);

                    await client.query(`
                        UPDATE companies 
                        SET city = $1, 
                            province_name = $1,
                            district = $2, 
                            district_name = $2,
                            neighborhood_name = $3,
                            address_line = $4
                        WHERE id = $5
                    `, [city, district, neighborhood, finalAddress, company.id]);

                    updatedCount++;
                } else {
                    errorCount++;
                }

                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error(`[Batch Update] Item Error:`, err);
                errorCount++;
            }
        }

        res.json({
            success: true,
            message: `${updatedCount} firma güncellendi. ${errorCount > 0 ? errorCount + ' hata oluştu.' : ''}`,
            count: updatedCount,
            has_more: result.rows.length === 50
        });
    } catch (error: any) {
        console.error('[Batch Update] Error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
    } finally {
        client.release();
    }
});

/**
 * POST /api/maps/import-salons
 * Import selected salons into the companies table
 */
router.post('/import-salons', authMiddleware, roleCheck(['super_admin', 'company_admin']), async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { salons } = req.body;
        if (!salons || !Array.isArray(salons)) {
            return res.status(400).json({ success: false, error: 'Salons array is required' });
        }

        await client.query('BEGIN');

        const importedIds = [];
        const userId = req.user!.userId;

        for (const salon of salons) {
            // Check if already exists by name and city/dist (basic check)
            const check = await client.query(
                'SELECT id FROM companies WHERE name = $1 AND (city = $2 OR province_name = $2)',
                [salon.name, salon.city]
            );

            if (check.rows.length > 0) continue;

            const adminKey = `OSM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const query = `
                INSERT INTO companies (
                    name, phone, website, address_line, 
                    province_name, district_name, neighborhood_name, city, district,
                    latitude, longitude, company_type, admin_key,
                    is_active, is_verified, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
            `;

            const values = [
                salon.name,
                salon.phone || null,
                salon.website || null,
                salon.address || null,
                salon.city || null,
                salon.district || null,
                salon.neighborhood || null,
                salon.city || null,
                salon.district || null,
                salon.lat,
                salon.lon,
                'ASIL',
                adminKey,
                true,
                true, // Auto-verify OSM imports?
                userId
            ];

            const result = await client.query(query, values);
            importedIds.push(result.rows[0].id);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `${importedIds.length} salon başarıyla içe aktarıldı`,
            count: importedIds.length
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[Import] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

export default router;
