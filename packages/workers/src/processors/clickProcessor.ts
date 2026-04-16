import { Job } from 'bullmq';
import { TicketClickModel, TicketLinkModel } from '@dizee-tickets/shared';

export interface ClickBatchJobData {
  clicks: Array<{
    ticketLinkId: string;
    showId: string;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
    country?: string;
    city?: string;
    device?: string;
  }>;
}

export async function processClickBatch(job: Job<ClickBatchJobData>) {
  const { clicks } = job.data;
  if (!clicks.length) return { processed: 0 };

  await TicketClickModel.insertMany(clicks, { ordered: false });

  const linkCounts: Record<string, number> = {};
  for (const click of clicks) {
    linkCounts[click.ticketLinkId] = (linkCounts[click.ticketLinkId] || 0) + 1;
  }

  const updates = Object.entries(linkCounts).map(([linkId, count]) =>
    TicketLinkModel.findByIdAndUpdate(linkId, { $inc: { clicks: count } })
  );
  await Promise.all(updates);

  return { processed: clicks.length };
}
