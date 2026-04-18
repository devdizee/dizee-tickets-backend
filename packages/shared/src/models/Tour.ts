import mongoose, { Schema, Document, Types } from 'mongoose';

export const TOUR_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type TourStatus = (typeof TOUR_STATUSES)[number];

export interface ITour extends Document {
  artistId: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  startDate?: Date;
  endDate?: Date;
  status: TourStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TourSchema = new Schema<ITour>(
  {
    artistId: { type: Schema.Types.ObjectId, ref: 'Artist', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, required: true, enum: TOUR_STATUSES, default: 'draft' },
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

TourSchema.index({ slug: 1 }, { unique: true });
TourSchema.index({ artistId: 1 });
TourSchema.index({ organizationId: 1 });

export const TourModel = mongoose.model<ITour>('Tour', TourSchema);
