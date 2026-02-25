import pool from '../config/database';

export interface Package {
    id?: number | null;
    company_id: number;
    name: string;
    description?: string | null;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
    staff_id?: number | null;
    department_id?: number | null;
    services?: any[];
}

export interface PackageServiceItem {
    id?: number;
    service_id: number;
    staff_id?: number | null;
    department_id?: number | null;
    order_index?: number;
}

class PackageService {
    async createPackage(pkg: Package, items: PackageServiceItem[]): Promise<Package> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO packages (company_id, name, description, duration_minutes, price, staff_id, department_id, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                RETURNING *
            `;
            const values = [
                pkg.company_id,
                pkg.name,
                pkg.description,
                pkg.duration_minutes,
                pkg.price,
                pkg.staff_id || null,
                pkg.department_id || null
            ];
            const result = await client.query(query, values);
            const newPackage = result.rows[0];

            if (items && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    await client.query(
                        'INSERT INTO package_services (package_id, service_id, staff_id, department_id, order_index) VALUES ($1, $2, $3, $4, $5)',
                        [newPackage.id, items[i].service_id, items[i].staff_id || null, items[i].department_id || null, i]
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
                   u.first_name as staff_first_name, u.last_name as staff_last_name,
                   d.name as department_name,
                   json_agg(json_build_object(
                       'id', s.id, 
                       'name', s.name, 
                       'duration_minutes', s.duration_minutes, 
                       'price', s.price,
                       'staff_id', ps.staff_id,
                       'staff_name', su.first_name || ' ' || su.last_name,
                       'department_id', ps.department_id
                   ) ORDER BY ps.order_index) as services
            FROM packages p
            LEFT JOIN package_services ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            LEFT JOIN users su ON ps.staff_id = su.id
            LEFT JOIN users u ON p.staff_id = u.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.company_id = $1 AND p.is_active = true
            GROUP BY p.id, u.id, d.id, u.first_name, u.last_name, d.name
            ORDER BY p.name
        `;
        const result = await pool.query(query, [companyId]);
        return result.rows;
    }

    async updatePackage(id: number, pkg: Partial<Package>, items?: PackageServiceItem[]): Promise<Package | null> {
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

            if (items) {
                // Remove old services
                await client.query('DELETE FROM package_services WHERE package_id = $1', [id]);
                // Add new services
                for (let i = 0; i < items.length; i++) {
                    await client.query(
                        'INSERT INTO package_services (package_id, service_id, staff_id, department_id, order_index) VALUES ($1, $2, $3, $4, $5)',
                        [id, items[i].service_id, items[i].staff_id || null, items[i].department_id || null, i]
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
                   u.first_name as staff_first_name, u.last_name as staff_last_name,
                   d.name as department_name,
                   json_agg(json_build_object(
                       'id', s.id, 
                       'name', s.name, 
                       'duration_minutes', s.duration_minutes, 
                       'price', s.price,
                       'staff_id', ps.staff_id,
                       'staff_name', su.first_name || ' ' || su.last_name,
                       'department_id', ps.department_id
                   ) ORDER BY ps.order_index) as services
            FROM packages p
            LEFT JOIN package_services ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            LEFT JOIN users su ON ps.staff_id = su.id
            LEFT JOIN users u ON p.staff_id = u.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = $1
            GROUP BY p.id, u.id, d.id, u.first_name, u.last_name, d.name
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
