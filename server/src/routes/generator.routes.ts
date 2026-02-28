import { Router, Request, Response } from 'express';
import axios from 'axios';
import pool from '../config/database';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';

const router = Router();

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
                    province_name, district_name, city, district,
                    latitude, longitude, company_type, admin_key,
                    is_active, is_verified, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id
            `;

            const values = [
                salon.name,
                salon.phone || null,
                salon.website || null,
                salon.address || null,
                salon.city || null,
                salon.district || null,
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
