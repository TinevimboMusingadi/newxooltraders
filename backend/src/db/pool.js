import pg from 'pg';
import { config } from '../config.js';

let pool = null;

if (config.databaseUrl) {
  pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[Postgres] Unexpected pool error:', err.message);
  });
}

export { pool };

export async function query(text, params) {
  if (!pool) throw new Error('Database not configured');
  const result = await pool.query(text, params);
  return result;
}

export async function getOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function getMany(text, params) {
  const result = await query(text, params);
  return result.rows;
}
