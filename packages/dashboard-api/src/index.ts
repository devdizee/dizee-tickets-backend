import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'development' ? '../../.env.dev' : '../../.env' });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import http from 'http';
import { securityStack } from './middleware/security';
import { requestLogger } from './middleware/logger';
import logger from './middleware/logger';
import routes from './routes';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'development') return callback(null, true);
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim());
    if (allowed.includes(origin) || allowed.includes('*')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(securityStack);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'dashboard-api', timestamp: new Date().toISOString() }));

// API routes
app.use('/api/v1', routes);

// 404
app.use((_req, res) => res.status(404).json({ status: 404, message: 'Not found' }));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ status: 500, message: 'Internal server error' });
});

// Database + Server
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || '';

async function start() {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
        retryWrites: true,
      });
      logger.info('Connected to MongoDB');
    } else {
      logger.warn('MONGODB_URI not set — database operations will fail');
    }

    const server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`Dashboard API running on port ${PORT}`);
      console.log(`Dashboard API running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

start();

export { app };
