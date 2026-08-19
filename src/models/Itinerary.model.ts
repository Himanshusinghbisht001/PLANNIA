import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IItineraryActivity {
  name: string;
  description: string;
  location: string;
  startTime: string;
  duration: string;
  estimatedCost: number;
  category: string;
}

export interface IItinerary extends Document {
  tripId: Types.ObjectId;
  userId: string; // Denormalized for fast ownership checks
  dayNumber: number;
  date: Date;
  title: string;
  activities: IItineraryActivity[];
  meals: string[];
  notes: string;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItineraryActivitySchema = new Schema<IItineraryActivity>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    startTime: { type: String, default: '' },
    duration: { type: String, default: '' },
    estimatedCost: { type: Number, default: 0, min: 0 },
    category: { type: String, trim: true, default: '' },
  },
  { _id: false }, // Embedded — no separate _id needed
);

const ItinerarySchema = new Schema<IItinerary>(
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
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    activities: {
      type: [ItineraryActivitySchema],
      default: [],
    },
    meals: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
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

// Compound index for fetching all days of a trip in order
ItinerarySchema.index({ tripId: 1, dayNumber: 1 });

export const Itinerary = mongoose.model<IItinerary>('Itinerary', ItinerarySchema);
