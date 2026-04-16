import mongoose, { Schema, Document, Types } from 'mongoose';

export const MEMBERSHIP_ROLES = [
  'owner',
  'admin',
  'editor',
  'viewer',
  'promoter_collaborator',
  'artist_collaborator',
] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export interface IMembership extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: MembershipRole;
  invitedByUserId?: Types.ObjectId;
  inviteEmail?: string;
  inviteToken?: string;
  inviteAcceptedAt?: Date;
  status: 'active' | 'pending' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, required: true, enum: MEMBERSHIP_ROLES, default: 'viewer' },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    inviteEmail: { type: String, lowercase: true, trim: true },
    inviteToken: { type: String, select: false },
    inviteAcceptedAt: { type: Date },
    status: { type: String, enum: ['active', 'pending', 'revoked'], default: 'active' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.inviteToken;
      },
    },
  }
);

MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
MembershipSchema.index({ organizationId: 1, status: 1 });
MembershipSchema.index({ inviteToken: 1 }, { sparse: true });

export const MembershipModel = mongoose.model<IMembership>('Membership', MembershipSchema);
