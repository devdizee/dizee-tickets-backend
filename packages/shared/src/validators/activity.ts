import { z } from 'zod';
import { ACTIVITY_SECTIONS, ACTIVITY_ACTIONS, ACTIVITY_STATUSES } from '../models/Activity';

export const createActivitySchema = z.object({
  section: z.enum(ACTIVITY_SECTIONS),
  action: z.enum(ACTIVITY_ACTIONS),
  itemId: z.string().min(1, 'itemId is required'),
  itemName: z.string().optional(),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  status: z.enum(ACTIVITY_STATUSES).optional().default('completed'),
  detail: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateActivityStatusSchema = z.object({
  status: z.enum(ACTIVITY_STATUSES),
});

export const listActivityQuerySchema = z.object({
  section: z.enum(ACTIVITY_SECTIONS).optional(),
  action: z.enum(ACTIVITY_ACTIONS).optional(),
  status: z.enum(ACTIVITY_STATUSES).optional(),
  itemId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(50),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityStatusInput = z.infer<typeof updateActivityStatusSchema>;
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;
