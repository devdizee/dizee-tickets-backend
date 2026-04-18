import mongoose, { Schema, Document } from 'mongoose';

export const WAITLIST_ROLES = ['artist', 'artist_rep', 'promoter'] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

export const WAITLIST_STATUSES = ['pending', 'invited', 'signed_up', 'rejected'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export interface IWaitlist extends Document {
  name: string;
  email: string;
  role: WaitlistRole;
  organizationName: string;
  instagramHandle?: string;
  bio?: string;
  source: string;
  status: WaitlistStatus;
  invitedAt?: Date;
  signedUpAt?: Date;
  metadata?: { ip?: string; userAgent?: string; referrer?: string };
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema<IWaitlist>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: WAITLIST_ROLES,
    },
    organizationName: { type: String, required: true, trim: true, maxlength: 300 },
    instagramHandle: { type: String, trim: true, maxlength: 100 },
    bio: { type: String, trim: true, maxlength: 5000 },
    source: { type: String, trim: true, default: 'landing' },
    status: {
      type: String,
      enum: WAITLIST_STATUSES,
      default: 'pending',
    },
    invitedAt: { type: Date },
    signedUpAt: { type: Date },
    metadata: {
      ip: { type: String },
      userAgent: { type: String },
      referrer: { type: String },
    },
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

WaitlistSchema.index({ email: 1 }, { unique: true });

export const WaitlistModel = mongoose.model<IWaitlist>('Waitlist', WaitlistSchema);
