import { Job } from 'bullmq';
import { syncShowFromTicketSocket, syncOrdersFromTicketSocket, syncBuyersAsFans } from '@dizee-tickets/shared';

export interface TicketSocketSyncJobData {
  showId: string;
  syncType: 'full' | 'orders' | 'buyers' | 'event';
}

export async function processTicketSocketSync(job: Job<TicketSocketSyncJobData>) {
  const { showId, syncType } = job.data;

  console.log(`Processing TicketSocket sync: ${syncType} for show ${showId}`);

  switch (syncType) {
    case 'full': {
      const eventResult = await syncShowFromTicketSocket(showId);
      const orderResult = await syncOrdersFromTicketSocket(showId);
      const buyerResult = await syncBuyersAsFans(showId);
      return { event: eventResult, orders: orderResult, buyers: buyerResult };
    }
    case 'event':
      return syncShowFromTicketSocket(showId);
    case 'orders':
      return syncOrdersFromTicketSocket(showId);
    case 'buyers':
      return syncBuyersAsFans(showId);
    default:
      throw new Error(`Unknown sync type: ${syncType}`);
  }
}
