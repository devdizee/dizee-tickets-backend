import { z } from 'zod';

export const createGuestListSchema = z.object({
  showId: z.string().min(1, 'Show is required'),
  capacity: z.number().int().min(0).optional(),
  closeAt: z.string().datetime().optional(),
  requireApproval: z.boolean().optional(),
});

export const updateGuestListSchema = z.object({
  enabled: z.boolean().optional(),
  capacity: z.number().int().min(0).optional().nullable(),
  closeAt: z.string().datetime().optional().nullable(),
  requireApproval: z.boolean().optional(),
});

export const submitGuestRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  requestedBy: z.string().max(100).optional(),
  guestCount: z.number().int().min(1).max(20).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateGuestListInput = z.infer<typeof createGuestListSchema>;
export type UpdateGuestListInput = z.infer<typeof updateGuestListSchema>;
export type SubmitGuestRequestInput = z.infer<typeof submitGuestRequestSchema>;
