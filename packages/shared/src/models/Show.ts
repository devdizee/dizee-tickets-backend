import mongoose, { Schema, Document, Types } from 'mongoose';

export const SHOW_STATUSES = [
  'draft',
  'confirmed',
  'on_sale',
  'paused',
  'sold_out',
  'completed',
  'cancelled',
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const TICKETING_PROVIDERS = ['ticketsocket', 'manual', 'other'] as const;
export type TicketingProvider = (typeof TICKETING_PROVIDERS)[number];

export interface IShow extends Document {
  title: string;
  slug: string;
  artistId: Types.ObjectId;
  promoterId?: Types.ObjectId;
  venueId?: Types.ObjectId;
  tourId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  date: Date;
  doorsTime?: string;
  showTime?: string;
  timezone?: string;
  status: ShowStatus;
  ticketingProvider: TicketingProvider;
  ticketSocketEventId?: string;
  capacity?: number;
  ticketsSold: number;
  grossSales: number;
  currency: string;
  publicTicketUrl?: string;
  guestListEnabled: boolean;
  notes?: string;
  manualOverride: {
    ticketsSold?: number;
    grossSales?: number;
    capacity?: number;
    lastUpdated?: Date;
    updatedBy?: Types.ObjectId;
    source?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ShowSchema = new Schema<IShow>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    artistId: { type: Schema.Types.ObjectId, ref: 'Artist', required: true },
    promoterId: { type: Schema.Types.ObjectId, ref: 'Promoter' },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue' },
    tourId: { type: Schema.Types.ObjectId, ref: 'Tour' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    date: { type: Date, required: true },
    doorsTime: { type: String },
    showTime: { type: String },
    timezone: { type: String, default: 'America/Los_Angeles' },
    status: { type: String, required: true, enum: SHOW_STATUSES, default: 'draft' },
    ticketingProvider: { type: String, required: true, enum: TICKETING_PROVIDERS, default: 'manual' },
    ticketSocketEventId: { type: String, sparse: true },
    capacity: { type: Number, min: 0 },
    ticketsSold: { type: Number, default: 0, min: 0 },
    grossSales: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    publicTicketUrl: { type: String },
    guestListEnabled: { type: Boolean, default: false },
    notes: { type: String },
    manualOverride: {
      ticketsSold: { type: Number },
      grossSales: { type: Number },
      capacity: { type: Number },
      lastUpdated: { type: Date },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      source: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

ShowSchema.index({ slug: 1 }, { unique: true });
ShowSchema.index({ artistId: 1, date: -1 });
ShowSchema.index({ promoterId: 1, date: -1 });
ShowSchema.index({ organizationId: 1, date: -1 });
ShowSchema.index({ tourId: 1 });
ShowSchema.index({ venueId: 1 });
ShowSchema.index({ status: 1, date: -1 });
ShowSchema.index({ ticketSocketEventId: 1 }, { sparse: true });

export const ShowModel = mongoose.model<IShow>('Show', ShowSchema);
