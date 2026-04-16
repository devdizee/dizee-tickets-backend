import { z } from 'zod';
import { TICKET_LINK_TYPES } from '../models/TicketLink';

export const createTicketLinkSchema = z.object({
  showId: z.string().min(1, 'Show is required'),
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(TICKET_LINK_TYPES).optional(),
  destinationUrl: z.string().url('Valid destination URL is required'),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export const updateTicketLinkSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  destinationUrl: z.string().url().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export type CreateTicketLinkInput = z.infer<typeof createTicketLinkSchema>;
export type UpdateTicketLinkInput = z.infer<typeof updateTicketLinkSchema>;
