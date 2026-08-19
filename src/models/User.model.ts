import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionPlan, SubscriptionStatus } from '../types/trip.types';

export interface IUser extends Document {
  clerkUserId: string;
  name: string;
  email: string;
  imageUrl?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkUserId: {
      type: String,
      required: [true, 'clerkUserId is required'],
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: [100, 'name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'pro'] satisfies SubscriptionPlan[],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'cancelled', 'expired'] satisfies SubscriptionStatus[],
      default: 'active',
    },
  },
  {
    timestamps: true,
    // Prevent leaking sensitive fields by default
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { __v?: unknown }).__v;
        return ret;
      },
    },
  },
);

export const User = mongoose.model<IUser>('User', UserSchema);
