import mongoose, { Schema, Document, Types } from 'mongoose';

export const GUEST_STATUSES = ['pending', 'approved', 'rejected', 'checked_in', 'cancelled'] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export interface IGuestRequest extends Document {
  guestListId: Types.ObjectId;
  showId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  requestedBy?: string;
  guestCount: number;
  notes?: string;
  status: GuestStatus;
  approvedByUserId?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GuestRequestSchema = new Schema<IGuestRequest>(
  {
    guestListId: { type: Schema.Types.ObjectId, ref: 'GuestList', required: true },
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    requestedBy: { type: String, trim: true },
    guestCount: { type: Number, required: true, min: 1, default: 1 },
    notes: { type: String },
    status: { type: String, required: true, enum: GUEST_STATUSES, default: 'pending' },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
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

GuestRequestSchema.index({ guestListId: 1, status: 1 });
GuestRequestSchema.index({ showId: 1, status: 1 });
GuestRequestSchema.index({ email: 1, showId: 1 });

export const GuestRequestModel = mongoose.model<IGuestRequest>('GuestRequest', GuestRequestSchema);
