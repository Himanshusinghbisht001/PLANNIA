import mongoose, { Document, Schema, Types } from 'mongoose';

export type AIGenerationStatus = 'pending' | 'success' | 'failed';

export interface IAIGeneration extends Document {
  userId: string;
  tripId?: Types.ObjectId;
  promptVersion: string;
  requestType: string;
  status: AIGenerationStatus;
  errorCode?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIGenerationSchema = new Schema<IAIGeneration>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      index: true,
    },
    promptVersion: {
      type: String,
      required: true,
      default: 'v1',
    },
    requestType: {
      type: String,
      required: true,
      default: 'trip_generation',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'] satisfies AIGenerationStatus[],
      default: 'pending',
    },
    /**
     * Safe error code only — never store raw error messages that
     * might contain secrets or sensitive stack traces.
     */
    errorCode: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { __v?: unknown }).__v;
        return ret;
      },
    },
  },
);

/**
 * TTL index — automatically delete AI generation logs after 90 days.
 * Keeps the collection lean and avoids unnecessary data retention.
 */
AIGenerationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AIGeneration = mongoose.model<IAIGeneration>('AIGeneration', AIGenerationSchema);
