import mongoose, { Schema, Document, Types } from 'mongoose';

export const TICKET_LINK_TYPES = [
  'artist',
  'promoter',
  'venue',
  'partner',
  'vip',
  'guest',
  'campaign',
] as const;
export type TicketLinkType = (typeof TICKET_LINK_TYPES)[number];

export const TICKET_LINK_STATUSES = ['active', 'inactive', 'archived'] as const;
export type TicketLinkStatus = (typeof TICKET_LINK_STATUSES)[number];

export interface ITicketLink extends Document {
  showId: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  name: string;
  slug: string;
  shortCode: string;
  type: TicketLinkType;
  destinationUrl: string;
  ticketSocketTrackingId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  clicks: number;
  orders: number;
  ticketsSold: number;
  grossSales: number;
  status: TicketLinkStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TicketLinkSchema = new Schema<ITicketLink>(
  {
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    shortCode: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, required: true, enum: TICKET_LINK_TYPES, default: 'artist' },
    destinationUrl: { type: String, required: true },
    ticketSocketTrackingId: { type: String },
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    clicks: { type: Number, default: 0, min: 0 },
    orders: { type: Number, default: 0, min: 0 },
    ticketsSold: { type: Number, default: 0, min: 0 },
    grossSales: { type: Number, default: 0, min: 0 },
    status: { type: String, required: true, enum: TICKET_LINK_STATUSES, default: 'active' },
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

TicketLinkSchema.index({ shortCode: 1 }, { unique: true });
TicketLinkSchema.index({ showId: 1, status: 1 });
TicketLinkSchema.index({ organizationId: 1 });
TicketLinkSchema.index({ slug: 1, showId: 1 });

export const TicketLinkModel = mongoose.model<ITicketLink>('TicketLink', TicketLinkSchema);
