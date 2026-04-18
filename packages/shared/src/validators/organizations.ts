import { z } from 'zod';
import { ORG_TYPES } from '../models/Organization';
import { MEMBERSHIP_ROLES } from '../models/Membership';

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(ORG_TYPES),
  website: z.string().url().optional().or(z.literal('')),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9][a-z0-9_-]*$/, 'Invalid username').optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(MEMBERSHIP_ROLES),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
