import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionPlan, SubscriptionStatus } from '../types/trip.types';

export interface ISubscription extends Document {
  userId: string;           // Clerk user ID
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider: 'stripe';
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro'] satisfies SubscriptionPlan[],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'cancelled', 'expired'] satisfies SubscriptionStatus[],
      default: 'active',
    },
    provider: {
      type: String,
      enum: ['stripe'],
      default: 'stripe',
    },
    providerCustomerId: {
      type: String,
      trim: true,
      sparse: true, // Allow null/undefined uniqueness
    },
    providerSubscriptionId: {
      type: String,
      trim: true,
      sparse: true,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { __v?: unknown }).__v;
        // Never expose payment provider IDs to the client unless necessary
        return ret;
      },
    },
  },
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
