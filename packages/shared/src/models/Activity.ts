import mongoose, { Schema, Document, Types } from 'mongoose';

export const ACTIVITY_SECTIONS = [
  'shows',
  'commerce',
  'guest_list',
  'links',
  'team',
  'fans',
  'settings',
] as const;
export type ActivitySection = (typeof ACTIVITY_SECTIONS)[number];

export const ACTIVITY_ACTIONS = [
  'add',
  'edit',
  'delete',
  'submit',
  'approval',
  'denial',
  'publish',
  'sync',
  'login',
  'signup',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_STATUSES = ['approved', 'pending', 'completed', 'denied'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export interface IActivity extends Document {
  section: ActivitySection | string;
  action: ActivityAction | string;
  itemId?: string;
  itemName?: string;
  userId?: Types.ObjectId;
  userEmail?: string;
  userName?: string;
  status: ActivityStatus | string;
  detail?: string;
  metadata?: Record<string, any>;
  orgId: Types.ObjectId;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    section: { type: String, required: true, enum: ACTIVITY_SECTIONS },
    action: { type: String, required: true },
    itemId: { type: String, index: true },
    itemName: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, lowercase: true, trim: true },
    userName: { type: String, trim: true },
    status: { type: String, enum: ACTIVITY_STATUSES, default: 'completed' },
    detail: { type: String },
    metadata: { type: Schema.Types.Mixed },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

ActivitySchema.index({ orgId: 1, timestamp: -1 });
ActivitySchema.index({ orgId: 1, section: 1, timestamp: -1 });
ActivitySchema.index({ orgId: 1, status: 1 });

export const ActivityModel = mongoose.model<IActivity>('Activity', ActivitySchema);
