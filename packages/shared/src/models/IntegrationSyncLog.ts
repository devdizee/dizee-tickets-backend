import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrationSyncLog extends Document {
  provider: 'ticketsocket';
  entityType: 'show' | 'order' | 'fan' | 'ticket_link';
  entityId?: string;
  status: 'success' | 'failed' | 'partial';
  message?: string;
  rawPayload?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

const IntegrationSyncLogSchema = new Schema<IIntegrationSyncLog>(
  {
    provider: { type: String, required: true, enum: ['ticketsocket'] },
    entityType: { type: String, required: true, enum: ['show', 'order', 'fan', 'ticket_link'] },
    entityId: { type: String },
    status: { type: String, required: true, enum: ['success', 'failed', 'partial'] },
    message: { type: String },
    rawPayload: { type: Schema.Types.Mixed },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

IntegrationSyncLogSchema.index({ provider: 1, entityType: 1, startedAt: -1 });
IntegrationSyncLogSchema.index({ status: 1 });
IntegrationSyncLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL: 90 days

export const IntegrationSyncLogModel = mongoose.model<IIntegrationSyncLog>(
  'IntegrationSyncLog',
  IntegrationSyncLogSchema
);
