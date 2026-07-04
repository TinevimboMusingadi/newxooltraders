import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { getSetupStatus } from './services/setupStatus.js';
import { createSessionMiddleware } from './middleware/session.js';
import authRoutes from './routes/auth.js';
import tradingRoutes from './routes/trading.js';
import marketsRoutes from './routes/markets.js';
import botsRoutes from './routes/bots.js';
import copyRoutes from './routes/copy.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(createSessionMiddleware());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config/public', (_req, res) => {
  res.json(getSetupStatus());
});

app.use('/auth', authRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/markets', marketsRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/copy', copyRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
