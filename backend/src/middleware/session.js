import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { config } from '../config.js';

const PgSession = connectPgSimple(session);

export function createSessionMiddleware() {
  const options = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  if (config.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });
    options.store = new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    });
  }

  return session(options);
}
