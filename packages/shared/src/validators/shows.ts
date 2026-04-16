import { z } from 'zod';
import { SHOW_STATUSES, TICKETING_PROVIDERS } from '../models/Show';

export const createShowSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  artistId: z.string().min(1, 'Artist is required'),
  promoterId: z.string().optional(),
  venueId: z.string().optional(),
  tourId: z.string().optional(),
  date: z.string().datetime({ message: 'Valid date is required' }),
  doorsTime: z.string().optional(),
  showTime: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(SHOW_STATUSES).optional(),
  ticketingProvider: z.enum(TICKETING_PROVIDERS).optional(),
  ticketSocketEventId: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  publicTicketUrl: z.string().url().optional().or(z.literal('')),
  guestListEnabled: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  currency: z.string().length(3).optional(),
});

export const updateShowSchema = createShowSchema.partial();

export type CreateShowInput = z.infer<typeof createShowSchema>;
export type UpdateShowInput = z.infer<typeof updateShowSchema>;
