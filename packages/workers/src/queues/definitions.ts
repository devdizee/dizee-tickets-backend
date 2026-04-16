import { Queue } from 'bullmq';
import { getRedisClient } from '@dizee-tickets/shared';

let connection: any = null;
function getConnection() {
  if (!connection) connection = getRedisClient();
  return connection;
}

export const ticketSocketSyncQueue = new Queue('ticketsocket-sync', { connection: getConnection() });
export const clickProcessorQueue = new Queue('click-processor', { connection: getConnection() });
export const fanEnrichmentQueue = new Queue('fan-enrichment', { connection: getConnection() });
export const emailNotificationQueue = new Queue('email-notification', { connection: getConnection() });
export const csvExportQueue = new Queue('csv-export', { connection: getConnection() });
export const showLifecycleQueue = new Queue('show-lifecycle', { connection: getConnection() });
