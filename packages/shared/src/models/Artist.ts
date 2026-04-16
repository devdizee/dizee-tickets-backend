import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArtist extends Document {
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  genre?: string;
  imageUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ArtistSchema = new Schema<IArtist>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    genre: { type: String, trim: true },
    imageUrl: { type: String },
    spotifyUrl: { type: String },
    instagramUrl: { type: String },
    websiteUrl: { type: String },
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

ArtistSchema.index({ slug: 1 }, { unique: true });
ArtistSchema.index({ organizationId: 1 });

export const ArtistModel = mongoose.model<IArtist>('Artist', ArtistSchema);
