import mongoose from 'mongoose';
import { Trip, ITrip } from '../models/Trip.model';
import { Itinerary } from '../models/Itinerary.model';
import { Hotel } from '../models/Hotel.model';
import { Activity } from '../models/Activity.model';
import { AIGeneration } from '../models/AIGeneration.model';
import { generateTrip, PROMPT_VERSION } from './ai.service';
import { CreateTripInput } from '../types/trip.types';
import { Errors } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface GetTripsOptions {
  userId: string;
  page: number;
  limit: number;
}

export interface GetTripsResult {
  trips: ITrip[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Get all trips for a user with pagination.
 * Sorted by newest first.
 */
export async function getTripsByUser(options: GetTripsOptions): Promise<GetTripsResult> {
  const { userId, page, limit } = options;
  const skip = (page - 1) * limit;

  const [trips, total] = await Promise.all([
    Trip.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Trip.countDocuments({ userId }),
  ]);

  return {
    trips: trips as unknown as ITrip[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single trip by ID.
 * SECURITY: Always verifies userId matches — prevents horizontal privilege escalation.
 */
export async function getTripById(tripId: string, userId: string): Promise<ITrip> {
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    // Return 404 regardless of whether the trip exists or belongs to another user.
    // This prevents leaking information about other users' trips.
    throw Errors.notFound('Trip');
  }
  return trip;
}

/**
 * Create a new trip, trigger AI generation, and persist all related documents.
 *
 * Flow:
 * 1. Create trip with status 'generating'
 * 2. Create AIGeneration log record
 * 3. Call AI service
 * 4. Save itinerary, hotels, activities in a transaction
 * 5. Update trip status to 'completed'
 * 6. On any failure → update trip status to 'failed'
 */
export async function createTripWithAI(
  input: CreateTripInput,
  userId: string,
): Promise<ITrip> {
  // Step 1: Create trip in 'generating' state
  const trip = await Trip.create({
    userId,
    title: `${input.destination} Trip`,
    destination: input.destination,
    origin: input.origin,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    travelers: input.travelers,
    budget: input.budget,
    currency: input.currency,
    travelStyle: input.travelStyle,
    interests: input.interests,
    notes: input.notes,
    status: 'generating',
  });

  // Step 2: Create AI generation log
  const aiLog = await AIGeneration.create({
    userId,
    tripId: trip._id,
    promptVersion: PROMPT_VERSION,
    requestType: 'trip_generation',
    status: 'pending',
  });

  try {
    // Step 3: Call AI service
    const aiOutput = await generateTrip(input);

    // Step 4: Save all related documents in a session transaction
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Save itinerary days
        const itineraryDocs = aiOutput.itinerary.map((day) => ({
          tripId: trip._id,
          userId,
          dayNumber: day.dayNumber,
          date: new Date(day.date),
          title: day.title,
          activities: day.activities,
          meals: day.meals,
          notes: day.notes,
          estimatedCost: day.estimatedCost,
        }));
        await Itinerary.insertMany(itineraryDocs, { session });

        // Save hotels
        const hotelDocs = aiOutput.hotels.map((hotel) => ({
          tripId: trip._id,
          userId,
          ...hotel,
        }));
        await Hotel.insertMany(hotelDocs, { session });

        // Save activities
        const activityDocs = aiOutput.activities.map((activity) => ({
          tripId: trip._id,
          userId,
          ...activity,
        }));
        await Activity.insertMany(activityDocs, { session });

        // Update trip to completed with AI summary data
        await Trip.findByIdAndUpdate(
          trip._id,
          {
            $set: {
              status: 'completed',
              title: `${aiOutput.destination} Trip`,
              aiGenerationId: aiLog._id,
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    // Update AI generation log to success
    await AIGeneration.findByIdAndUpdate(aiLog._id, {
      $set: { status: 'success', completedAt: new Date() },
    });

    logger.info('Trip created successfully', {
      operation: 'create_trip',
      status: 'completed',
    });

    // Return the updated trip
    const updatedTrip = await Trip.findById(trip._id);
    return updatedTrip!;
  } catch (error) {
    // Update trip and AI log to failed state
    await Promise.allSettled([
      Trip.findByIdAndUpdate(trip._id, { $set: { status: 'failed' } }),
      AIGeneration.findByIdAndUpdate(aiLog._id, {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          errorCode:
            error instanceof Error ? error.message.slice(0, 50) : 'UNKNOWN_ERROR',
        },
      }),
    ]);

    logger.error('Trip generation failed', {
      operation: 'create_trip',
      code: 'TRIP_GENERATION_FAILED',
    });

    throw error;
  }
}

/**
 * Delete a trip and all associated documents.
 * SECURITY: Verifies ownership before deleting.
 */
export async function deleteTripById(tripId: string, userId: string): Promise<void> {
  // Verify ownership
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    throw Errors.notFound('Trip');
  }

  // Cascade delete in a transaction
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all([
        Trip.findByIdAndDelete(tripId, { session }),
        Itinerary.deleteMany({ tripId }, { session }),
        Hotel.deleteMany({ tripId }, { session }),
        Activity.deleteMany({ tripId }, { session }),
      ]);
    });
  } finally {
    await session.endSession();
  }

  logger.info('Trip deleted with cascade', { operation: 'delete_trip' });
}
