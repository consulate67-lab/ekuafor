import pool from '../config/database';

export interface Package {
    id?: number;
    company_id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
    services?: any[];
}

class PackageService {
    async createPackage(pkg: Package, serviceIds: number[]): Promise<Package> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO packages (company_id, name, description, duration_minutes, price)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [
                pkg.company_id,
                pkg.name,
                pkg.description,
                pkg.duration_minutes,
                pkg.price
            ];
            const result = await client.query(query, values);
            const newPackage = result.rows[0];

            if (serviceIds && serviceIds.length > 0) {
                for (let i = 0; i < serviceIds.length; i++) {
                    await client.query(
                        'INSERT INTO package_services (package_id, service_id, order_index) VALUES ($1, $2, $3)',
                        [newPackage.id, serviceIds[i], i]
                    );
                }
            }

            await client.query('COMMIT');
            return newPackage;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPackagesByCompany(companyId: number): Promise<Package[]> {
        const query = `
            SELECT p.*, 
                   json_agg(json_build_object('id', s.id, 'name', s.name, 'duration_minutes', s.duration_minutes, 'price', s.price) ORDER BY ps.order_index) as services
            FROM packages p
            LEFT JOIN package_services ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            WHERE p.company_id = $1 AND p.is_active = true
            GROUP BY p.id
            ORDER BY p.name
        `;
        const result = await pool.query(query, [companyId]);
        return result.rows;
    }

    async updatePackage(id: number, pkg: Partial<Package>, serviceIds?: number[]): Promise<Package | null> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const fields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            const { services, ...pkgData } = pkg;

            Object.entries(pkgData).forEach(([key, value]) => {
                if (value !== undefined && key !== 'id' && key !== 'company_id') {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });

            if (fields.length > 0) {
                values.push(id);
                const query = `
                    UPDATE packages 
                    SET ${fields.join(', ')} 
                    WHERE id = $${paramIndex} 
                    RETURNING *
                `;
                await client.query(query, values);
            }

            if (serviceIds) {
                // Remove old services
                await client.query('DELETE FROM package_services WHERE package_id = $1', [id]);
                // Add new services
                for (let i = 0; i < serviceIds.length; i++) {
                    await client.query(
                        'INSERT INTO package_services (package_id, service_id, order_index) VALUES ($1, $2, $3)',
                        [id, serviceIds[i], i]
                    );
                }
            }

            await client.query('COMMIT');

            // Fetch updated package with services
            const updated = await this.getPackageById(id);
            return updated;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPackageById(id: number): Promise<Package | null> {
        const query = `
            SELECT p.*, 
                   json_agg(json_build_object('id', s.id, 'name', s.name, 'duration_minutes', s.duration_minutes, 'price', s.price) ORDER BY ps.order_index) as services
            FROM packages p
            LEFT JOIN package_services ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            WHERE p.id = $1
            GROUP BY p.id
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    async deletePackage(id: number): Promise<boolean> {
        const result = await pool.query(
            'UPDATE packages SET is_active = false WHERE id = $1',
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }
}

export default new PackageService();
