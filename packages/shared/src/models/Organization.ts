import mongoose, { Schema, Document } from 'mongoose';

export const ORG_TYPES = ['artist', 'promoter', 'venue', 'admin', 'partner'] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type: OrgType;
  logoUrl?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, required: true, enum: ORG_TYPES },
    logoUrl: { type: String },
    website: { type: String },
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

OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ type: 1 });

export const OrganizationModel = mongoose.model<IOrganization>('Organization', OrganizationSchema);
