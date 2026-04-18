import { Types } from 'mongoose';
import {
  ActivityModel,
  type ActivitySection,
  type ActivityAction,
  type ActivityStatus,
} from '@dizee-tickets/shared';

export interface LogActivityInput {
  section: ActivitySection | string;
  action: ActivityAction | string;
  itemId?: string;
  itemName?: string;
  detail?: string;
  userId?: Types.ObjectId | string;
  userEmail?: string;
  userName?: string;
  orgId: Types.ObjectId | string;
  status?: ActivityStatus | string;
  metadata?: Record<string, any>;
}

/**
 * Fire-and-forget activity logger. Errors are swallowed so logging never breaks a request.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await ActivityModel.create({
      section: input.section,
      action: input.action,
      itemId: input.itemId,
      itemName: input.itemName,
      detail: input.detail,
      userId: input.userId,
      userEmail: input.userEmail,
      userName: input.userName,
      orgId: input.orgId,
      status: input.status || 'completed',
      metadata: input.metadata,
      timestamp: new Date(),
    });
  } catch {
    // no-op — logging failures should not break the caller
  }
}
