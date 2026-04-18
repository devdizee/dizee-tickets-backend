import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGuestList extends Document {
  showId: Types.ObjectId;
  organizationId: Types.ObjectId;
  slug: string;
  enabled: boolean;
  capacity?: number;
  closeAt?: Date;
  requireApproval: boolean;
  passwordRequired?: boolean;
  accessPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuestListSchema = new Schema<IGuestList>(
  {
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    enabled: { type: Boolean, default: true },
    capacity: { type: Number, min: 0 },
    closeAt: { type: Date },
    requireApproval: { type: Boolean, default: true },
    passwordRequired: { type: Boolean, default: false },
    accessPassword: { type: String },
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

GuestListSchema.index({ slug: 1 }, { unique: true });
GuestListSchema.index({ showId: 1 }, { unique: true });
GuestListSchema.index({ organizationId: 1 });

export const GuestListModel = mongoose.model<IGuestList>('GuestList', GuestListSchema);
