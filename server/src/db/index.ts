import { drizzle } from 'drizzle-orm/node-postgres';
import pool from '../config/database';
import * as schema from './schema';

/**
 * Drizzle ORM client. Raw `pool.query` kullanan kodla aynı pool'u paylaşır.
 *
 * Kullanım:
 *   import { db } from './db';
 *   import { users } from './db/schema';
 *   const all = await db.select().from(users);
 */
export const db = drizzle(pool, { schema });
export { pool };

export type Database = typeof db;
