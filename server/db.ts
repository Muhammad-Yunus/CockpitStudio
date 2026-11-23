import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema.ts';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const pool = new Pool({
  host: process.env.PGHOST || 'aws-0-ap-south-1.pooler.supabase.com',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres.glyrorngeaynbqmdlbny',
  password: process.env.PGPASSWORD || '',
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
export { pool };

export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL connection verification failed:', error);
    return false;
  }
}
