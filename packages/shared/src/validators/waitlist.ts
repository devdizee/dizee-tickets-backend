import { z } from 'zod';
import { WAITLIST_ROLES } from '../models/Waitlist';

export const submitWaitlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address'),
  role: z.enum(WAITLIST_ROLES),
  organizationName: z.string().min(1, 'Artist or company name is required').max(300),
  instagramHandle: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().max(5000).optional().or(z.literal('')),
  source: z.string().max(100).optional().or(z.literal('')),
});

export type SubmitWaitlistInput = z.infer<typeof submitWaitlistSchema>;
