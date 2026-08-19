import mongoose, { Document, Schema, Types } from 'mongoose';
import { ActivityCategory } from '../types/trip.types';

export interface IActivity extends Document {
  tripId: Types.ObjectId;
  userId: string; // Denormalized for fast ownership checks
  name: string;
  category: ActivityCategory;
  description: string;
  location: string;
  estimatedCost: number;
  duration: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'Adventure', 'Nature', 'Culture', 'Food',
  'Shopping', 'History', 'Entertainment', 'Relaxation',
];

const ActivitySchema = new Schema<IActivity>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ACTIVITY_CATEGORIES,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
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

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
