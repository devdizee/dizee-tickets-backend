import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'development' ? '../../.env.dev' : '../../.env' });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import routes from './routes';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'webhook-api' }));
app.use('/webhooks', routes);

// In development, ignore shared `PORT` so `npm run dev` (Turbo) does not make every API bind the same port.
const PORT =
  process.env.WEBHOOK_PORT ||
  (process.env.NODE_ENV !== 'development' ? process.env.PORT : undefined) ||
  8001;
const MONGODB_URI = process.env.MONGODB_URI || '';

async function start() {
  if (MONGODB_URI) {
    await mongoose.connect(MONGODB_URI, { maxPoolSize: 5, minPoolSize: 2, retryWrites: true });
    console.log('Webhook API connected to MongoDB');
  }

  app.listen(PORT, () => {
    console.log(`Webhook API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => { console.error('Webhook API failed to start:', err); process.exit(1); });

export { app };
