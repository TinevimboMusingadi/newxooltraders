import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config.js';
import { getSetupStatus } from './services/setupStatus.js';
import { createSessionMiddleware } from './middleware/session.js';
import { redis } from './lib/redis.js';
import { pool } from './db/pool.js';
import { apiLimiter, authLimiter, tradeLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import tradingRoutes from './routes/trading.js';
import marketsRoutes from './routes/markets.js';
import botsRoutes from './routes/bots.js';
import copyRoutes from './routes/copy.js';
import historyRoutes from './routes/history.js';

if (pool) {
  import('./db/queries/platform.js').then((m) => m.ensureTables().catch(console.error));
}

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(createSessionMiddleware());

app.get('/health', async (_req, res) => {
  const status = { status: 'ok', timestamp: new Date().toISOString() };
  status.redis = redis ? 'connected' : 'disabled';
  status.postgres = pool ? 'configured' : 'disabled';
  res.json(status);
});

app.get('/api/config/public', (_req, res) => {
  res.json(getSetupStatus());
});

app.use('/auth', authLimiter, authRoutes);
app.use('/api/trading', tradeLimiter, tradingRoutes);
app.use('/api/markets', apiLimiter, marketsRoutes);
app.use('/api/bots', apiLimiter, botsRoutes);
app.use('/api/copy', tradeLimiter, copyRoutes);
app.use('/api/history', apiLimiter, historyRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    pool?.end();
    redis?.disconnect();
    process.exit(0);
  });
});
