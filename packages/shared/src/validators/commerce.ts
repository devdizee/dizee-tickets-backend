import { z } from 'zod';
import { MERCH_TYPES, MERCH_STATUSES } from '../models/Merch';

export const createMerchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(MERCH_TYPES).optional(),
  sku: z.string().optional(),
  vendor: z.string().optional(),
  variant: z.string().optional(),
  tags: z.array(z.string()).optional(),
  price: z.number().nonnegative().optional(),
  compare_at_price: z.number().nonnegative().optional(),
  currency: z.string().optional().default('USD'),

  image_url: z.string().optional(),
  image_base64: z.string().optional(),

  assigned_show_id: z.string().optional(),
  show_on_ticket_link: z.boolean().optional().default(true),

  status: z.enum(MERCH_STATUSES).optional().default('draft'),

  units_sold: z.number().int().nonnegative().optional(),
  gross: z.number().nonnegative().optional(),

  shopify_product_id: z.string().optional(),
});

export const updateMerchSchema = createMerchSchema.partial();

export type CreateMerchInput = z.infer<typeof createMerchSchema>;
export type UpdateMerchInput = z.infer<typeof updateMerchSchema>;
