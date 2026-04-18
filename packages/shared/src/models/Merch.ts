import mongoose, { Schema, Document, Types } from 'mongoose';

export const MERCH_TYPES = ['physical', 'digital', 'bundle'] as const;
export type MerchType = (typeof MERCH_TYPES)[number];

export const MERCH_STATUSES = ['draft', 'active', 'archived'] as const;
export type MerchStatus = (typeof MERCH_STATUSES)[number];

export interface IMerch extends Document {
  name: string;
  description?: string;
  type?: MerchType | string;
  sku?: string;
  vendor?: string;
  variant?: string;
  tags: string[];
  price?: number;
  compare_at_price?: number;
  currency: string;

  image_url?: string;
  image_base64?: string;

  assigned_show_id?: string;
  show_on_ticket_link: boolean;

  status: MerchStatus | string;

  units_sold: number;
  gross: number;

  shopify_product_id?: string;

  orgId: Types.ObjectId;
  createdBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const MerchSchema = new Schema<IMerch>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, enum: MERCH_TYPES, default: 'physical' },
    sku: { type: String, trim: true },
    vendor: { type: String, trim: true },
    variant: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    price: { type: Number },
    compare_at_price: { type: Number },
    currency: { type: String, default: 'USD', uppercase: true },

    image_url: { type: String },
    image_base64: { type: String },

    assigned_show_id: { type: String },
    show_on_ticket_link: { type: Boolean, default: true },

    status: { type: String, enum: MERCH_STATUSES, default: 'draft' },

    units_sold: { type: Number, default: 0, min: 0 },
    gross: { type: Number, default: 0, min: 0 },

    shopify_product_id: { type: String, sparse: true },

    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

MerchSchema.index({ orgId: 1, createdAt: -1 });
MerchSchema.index({ orgId: 1, status: 1 });
MerchSchema.index({ orgId: 1, assigned_show_id: 1 });

export const MerchModel = mongoose.model<IMerch>('Merch', MerchSchema);
