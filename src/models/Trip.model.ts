import mongoose, { Document, Schema, Types } from 'mongoose';
import { TripStatus, TravelStyle } from '../types/trip.types';

export interface ITrip extends Document {
  userId: string;          // Clerk user ID — used for ownership checks
  title: string;
  destination: string;
  origin: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  budget: number;
  currency: string;
  travelStyle: TravelStyle;
  interests: string[];
  notes?: string;
  status: TripStatus;
  aiGenerationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: [200, 'title cannot exceed 200 characters'],
    },
    destination: {
      type: String,
      required: [true, 'destination is required'],
      trim: true,
      maxlength: [100, 'destination cannot exceed 100 characters'],
    },
    origin: {
      type: String,
      required: [true, 'origin is required'],
      trim: true,
      maxlength: [100, 'origin cannot exceed 100 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'startDate is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'endDate is required'],
    },
    travelers: {
      type: Number,
      required: [true, 'travelers is required'],
      min: [1, 'travelers must be at least 1'],
      max: [50, 'travelers cannot exceed 50'],
    },
    budget: {
      type: Number,
      required: [true, 'budget is required'],
      min: [0, 'budget cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
      maxlength: 3,
    },
    travelStyle: {
      type: String,
      enum: ['adventure', 'relaxation', 'cultural', 'budget', 'luxury'] satisfies TravelStyle[],
      required: [true, 'travelStyle is required'],
    },
    interests: {
      type: [String],
      required: [true, 'interests are required'],
      validate: {
        validator: (v: string[]) => v.length >= 1 && v.length <= 10,
        message: 'interests must have between 1 and 10 items',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'notes cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['draft', 'generating', 'completed', 'failed'] satisfies TripStatus[],
      default: 'draft',
    },
    aiGenerationId: {
      type: Schema.Types.ObjectId,
      ref: 'AIGeneration',
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

// Compound index for efficient user trip listing with sort
TripSchema.index({ userId: 1, createdAt: -1 });

// Validate startDate <= endDate
TripSchema.pre('save', function (next) {
  if (this.startDate > this.endDate) {
    next(new Error('startDate must be before or equal to endDate'));
  } else {
    next();
  }
});

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
