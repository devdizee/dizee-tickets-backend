import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFan extends Document {
  organizationId: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  region?: string;
  country?: string;
  source?: string;
  tags: string[];
  marketingOptIn: boolean;
  totalTicketsPurchased: number;
  totalSpent: number;
  showIds: Types.ObjectId[];
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FanSchema = new Schema<IFan>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true },
    source: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    marketingOptIn: { type: Boolean, default: false },
    totalTicketsPurchased: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    showIds: [{ type: Schema.Types.ObjectId, ref: 'Show' }],
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
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

FanSchema.index({ organizationId: 1, email: 1 }, { unique: true, sparse: true });
FanSchema.index({ organizationId: 1, lastSeenAt: -1 });
FanSchema.index({ organizationId: 1, city: 1 });
FanSchema.index({ organizationId: 1, source: 1 });
FanSchema.index({ showIds: 1 });

export const FanModel = mongoose.model<IFan>('Fan', FanSchema);
