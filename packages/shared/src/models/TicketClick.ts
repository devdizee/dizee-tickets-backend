import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITicketClick extends Document {
  ticketLinkId: Types.ObjectId;
  showId: Types.ObjectId;
  ipHash?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
  device?: string;
  createdAt: Date;
}

const TicketClickSchema = new Schema<ITicketClick>(
  {
    ticketLinkId: { type: Schema.Types.ObjectId, ref: 'TicketLink', required: true },
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
    ipHash: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    country: { type: String },
    city: { type: String },
    device: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

TicketClickSchema.index({ ticketLinkId: 1, createdAt: -1 });
TicketClickSchema.index({ showId: 1, createdAt: -1 });
TicketClickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL: 90 days

export const TicketClickModel = mongoose.model<ITicketClick>('TicketClick', TicketClickSchema);
