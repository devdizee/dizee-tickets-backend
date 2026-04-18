import mongoose, { Schema, Document, Types } from 'mongoose';

export const ORDER_STATUSES = ['paid', 'refunded', 'cancelled', 'pending'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface ITicketOrder extends Document {
  showId: Types.ObjectId;
  ticketLinkId?: Types.ObjectId;
  fanId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  provider: 'ticketsocket' | 'manual' | 'other';
  providerOrderId?: string;
  buyerName?: string;
  buyerEmail?: string;
  quantity: number;
  grossAmount: number;
  netAmount?: number;
  currency: string;
  orderStatus: OrderStatus;
  purchasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketOrderSchema = new Schema<ITicketOrder>(
  {
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
    ticketLinkId: { type: Schema.Types.ObjectId, ref: 'TicketLink' },
    fanId: { type: Schema.Types.ObjectId, ref: 'Fan' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    provider: { type: String, required: true, enum: ['ticketsocket', 'manual', 'other'], default: 'manual' },
    providerOrderId: { type: String },
    buyerName: { type: String, trim: true },
    buyerEmail: { type: String, lowercase: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    grossAmount: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    orderStatus: { type: String, required: true, enum: ORDER_STATUSES, default: 'paid' },
    purchasedAt: { type: Date, required: true },
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

TicketOrderSchema.index({ showId: 1, purchasedAt: -1 });
TicketOrderSchema.index({ ticketLinkId: 1 });
TicketOrderSchema.index({ fanId: 1 });
TicketOrderSchema.index({ organizationId: 1, purchasedAt: -1 });
TicketOrderSchema.index({ providerOrderId: 1, provider: 1 }, { sparse: true });

export const TicketOrderModel = mongoose.model<ITicketOrder>('TicketOrder', TicketOrderSchema);
