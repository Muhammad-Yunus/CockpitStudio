import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ override: true });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.PGHOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres.glyrorngeaynbqmdlbny',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'postgres',
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  },
});
