import { z } from 'zod';
import { SHOW_STATUSES } from '../models/Show';

export const createShowSchema = z.object({
  artist: z.string().min(1, 'Artist is required').max(200),
  perf_date: z.string().min(1, 'Performance date is required'),
  end_date: z.string().optional(),
  status: z.enum(SHOW_STATUSES).optional().default('pending'),

  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  venue: z.string().optional(),
  venue_category: z.string().optional(),
  territory: z.string().optional(),

  promoter: z.string().optional(),
  promoter_company: z.string().optional(),
  promoter_contact_emails: z.string().optional(),
  appearing_with: z.string().optional(),

  show_time: z.string().optional(),
  announce_date: z.string().optional(),
  on_sale_date: z.string().optional(),
  on_sale: z.boolean().optional().default(false),

  contract_status: z.string().optional(),
  deal_type: z.string().optional(),
  deal_info: z.string().optional(),
  billing_type: z.string().optional(),
  split_point: z.string().optional(),

  guarantee: z.number().optional(),
  walkout_potential: z.number().optional(),
  gross_potential: z.number().optional(),
  net_potential: z.number().optional(),
  artist_net: z.number().optional(),
  commission_rate: z.string().optional(),
  commission_amount: z.string().optional(),
  currency: z.string().optional().default('USD'),

  sellable_cap: z.number().optional(),
  tix_sold: z.number().optional(),
  ticket_tracking: z.boolean().optional().default(false),
  ticket_link: z.string().optional(),
  ticket_notes: z.string().optional(),

  bonus_tiers: z.array(z.object({
    tickets_threshold: z.number(),
    bonus_amount: z.number(),
  })).optional(),

  notes: z.string().max(5000).optional(),
  red_flag: z.boolean().optional().default(false),
  red_flag_notes: z.string().optional(),

  show_on_ticket_link: z.boolean().optional(),
  ticket_page_password_enabled: z.boolean().optional(),
  ticket_page_password: z.string().max(200).optional().or(z.literal('')),
  ticket_public_price: z.number().min(0).optional(),
  ticket_public_quantity: z.number().int().min(0).optional(),
});

export const updateShowSchema = createShowSchema.partial();

export type CreateShowInput = z.infer<typeof createShowSchema>;
export type UpdateShowInput = z.infer<typeof updateShowSchema>;
