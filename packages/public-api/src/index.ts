import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'development' ? '../../.env.dev' : '../../.env' });

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { handleLinkRedirect } from './handlers/redirect';
import { submitGuestRequest, getPublicGuestList } from './handlers/guestRequest';
import { getPublicShow } from './handlers/publicShow';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const publicLimiter = rateLimit({
  windowMs: 60000,
  max: 100,
  keyGenerator: (req) => req.ip || 'unknown',
});

const guestListLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => req.ip || 'unknown',
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'public-api' }));

// Link redirect — hottest path
app.get('/l/:code', handleLinkRedirect);

// Public show data
app.get('/shows/:slug', publicLimiter, getPublicShow);

// Guest list
app.get('/guest/:slug', publicLimiter, getPublicGuestList);
app.post('/guest/:slug', guestListLimiter, submitGuestRequest);

const PORT = process.env.PUBLIC_API_PORT || 8002;
const MONGODB_URI = process.env.MONGODB_URI || '';

async function start() {
  if (MONGODB_URI) {
    await mongoose.connect(MONGODB_URI, { maxPoolSize: 5, minPoolSize: 2, retryWrites: true });
    console.log('Public API connected to MongoDB');
  }

  app.listen(PORT, () => {
    console.log(`Public API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => { console.error('Public API failed to start:', err); process.exit(1); });

export { app };
