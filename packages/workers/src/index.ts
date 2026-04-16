import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'development' ? '../../.env.dev' : '../../.env' });

import mongoose from 'mongoose';
import { Worker } from 'bullmq';
import { getRedisClient } from '@dizee-tickets/shared';
import cron from 'node-cron';
import { processTicketSocketSync, TicketSocketSyncJobData } from './processors/ticketSocketSync';
import { processClickBatch, ClickBatchJobData } from './processors/clickProcessor';
import { processShowLifecycle } from './processors/showLifecycle';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function start() {
  if (MONGODB_URI) {
    await mongoose.connect(MONGODB_URI, { maxPoolSize: 5, minPoolSize: 2, retryWrites: true });
    console.log('Workers connected to MongoDB');
  }

  const connection = getRedisClient();

  const syncWorker = new Worker<TicketSocketSyncJobData>('ticketsocket-sync', processTicketSocketSync, {
    connection, concurrency: 10,
  });

  const clickWorker = new Worker<ClickBatchJobData>('click-processor', processClickBatch, {
    connection, concurrency: 2,
  });

  syncWorker.on('completed', (job) => console.log(`TS sync completed: ${job.id}`));
  syncWorker.on('failed', (job, err) => console.error(`TS sync failed: ${job?.id}`, err.message));
  clickWorker.on('completed', (job) => console.log(`Click batch completed: ${job.id}`));
  clickWorker.on('failed', (job, err) => console.error(`Click batch failed: ${job?.id}`, err.message));

  // Cron: mark past shows as completed — daily at 4 AM PST
  cron.schedule('0 4 * * *', async () => {
    console.log('Running show lifecycle job...');
    await processShowLifecycle();
  }, { timezone: 'America/Los_Angeles' });

  console.log('Workers started. Listening for jobs...');
}

start().catch((err) => { console.error('Workers failed to start:', err); process.exit(1); });
