import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromoter extends Document {
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  websiteUrl?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromoterSchema = new Schema<IPromoter>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    websiteUrl: { type: String },
    primaryContactName: { type: String, trim: true },
    primaryContactEmail: { type: String, lowercase: true, trim: true },
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

PromoterSchema.index({ slug: 1 }, { unique: true });
PromoterSchema.index({ organizationId: 1 });

export const PromoterModel = mongoose.model<IPromoter>('Promoter', PromoterSchema);
