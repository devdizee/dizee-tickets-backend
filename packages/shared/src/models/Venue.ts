import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVenue extends Document {
  organizationId?: Types.ObjectId;
  name: string;
  slug: string;
  address?: string;
  city: string;
  region?: string;
  country?: string;
  capacity?: number;
  primaryContactName?: string;
  primaryContactEmail?: string;
  ticketingProvider?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema = new Schema<IVenue>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true },
    capacity: { type: Number, min: 0 },
    primaryContactName: { type: String, trim: true },
    primaryContactEmail: { type: String, lowercase: true, trim: true },
    ticketingProvider: { type: String, trim: true },
    notes: { type: String },
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

VenueSchema.index({ organizationId: 1 });
VenueSchema.index({ city: 1, country: 1 });

export const VenueModel = mongoose.model<IVenue>('Venue', VenueSchema);
