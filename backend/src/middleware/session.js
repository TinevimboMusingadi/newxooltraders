import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { default as connectRedis } from 'connect-redis';
import pg from 'pg';
import { config } from '../config.js';
import { redis } from '../lib/redis.js';

const PgSession = connectPgSimple(session);
const RedisStore = connectRedis(session);

export function createSessionMiddleware() {
  const options = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'nxsid',
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  if (redis) {
    options.store = new RedisStore({ client: redis, prefix: 'sess:' });
    console.log('[Session] Using Redis store');
  } else if (config.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });
    options.store = new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    });
    console.log('[Session] Using Postgres store');
  } else {
    console.warn('[Session] Using memory store — not for production');
  }

  return session(options);
}
