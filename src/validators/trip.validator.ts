import { z } from 'zod';

// ---------------------------------------------------------------------------
// Trip input validator
// ---------------------------------------------------------------------------

export const createTripSchema = z
  .object({
    destination: z
      .string({ required_error: 'destination is required' })
      .min(2, 'destination must be at least 2 characters')
      .max(100, 'destination cannot exceed 100 characters')
      .trim(),

    origin: z
      .string({ required_error: 'origin is required' })
      .min(2, 'origin must be at least 2 characters')
      .max(100, 'origin cannot exceed 100 characters')
      .trim(),

    startDate: z
      .string({ required_error: 'startDate is required' })
      .datetime({ message: 'startDate must be a valid ISO 8601 date string' }),

    endDate: z
      .string({ required_error: 'endDate is required' })
      .datetime({ message: 'endDate must be a valid ISO 8601 date string' }),

    travelers: z
      .number({ required_error: 'travelers is required' })
      .int('travelers must be a whole number')
      .min(1, 'at least 1 traveler is required')
      .max(50, 'travelers cannot exceed 50'),

    budget: z
      .number({ required_error: 'budget is required' })
      .min(0, 'budget cannot be negative')
      .max(10_000_000, 'budget exceeds maximum allowed value'),

    currency: z.string().default('INR').transform((value) => value.toUpperCase()),

    travelStyle: z.enum(
      ['adventure', 'relaxation', 'cultural', 'budget', 'luxury'],
      { required_error: 'travelStyle is required' },
    ),

    interests: z
      .array(z.string().trim().min(1))
      .min(1, 'at least 1 interest is required')
      .max(10, 'interests cannot exceed 10 items'),

    notes: z
      .string()
      .max(500, 'notes cannot exceed 500 characters')
      .trim()
      .optional(),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    },
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;

// ---------------------------------------------------------------------------
// Trip params validator
// ---------------------------------------------------------------------------

export const tripParamsSchema = z.object({
  tripId: z
    .string({ required_error: 'tripId is required' })
    .regex(/^[a-f\d]{24}$/i, 'tripId must be a valid MongoDB ObjectId'),
});

// ---------------------------------------------------------------------------
// My trips pagination query validator
// ---------------------------------------------------------------------------

export const tripsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
});

// ---------------------------------------------------------------------------
// AI output schema — validates Gemini response before saving to DB
// ---------------------------------------------------------------------------

const aiHotelSchema = z.object({
  name: z.string().min(1),
  location: z.string().default(''),
  rating: z.number().min(0).max(5).default(0),
  priceRange: z.string().default(''),
  description: z.string().default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  image: z.string().optional(),
});

const aiActivitySchema = z.object({
  name: z.string().min(1),
  category: z.string().default(''),
  description: z.string().default(''),
  location: z.string().default(''),
  estimatedCost: z.number().min(0).default(0),
  duration: z.string().default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const aiItineraryActivitySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  location: z.string().default(''),
  startTime: z.string().default(''),
  duration: z.string().default(''),
  estimatedCost: z.number().min(0).default(0),
  category: z.string().default(''),
});

const aiItineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string(),
  title: z.string().min(1),
  activities: z.array(aiItineraryActivitySchema).default([]),
  meals: z.array(z.string()).default([]),
  notes: z.string().default(''),
  estimatedCost: z.number().min(0).default(0),
});

const aiMapLocationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['destination', 'hotel', 'activity']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const aiOutputSchema = z.object({
  destination: z.string().min(1),
  summary: z.string().min(1),
  budget: z.object({
    currency: z.string().default('INR'),
    estimatedTotal: z.number().min(0),
    breakdown: z.record(z.number()).optional(),
  }),
  hotels: z.array(aiHotelSchema).min(1),
  activities: z.array(aiActivitySchema).min(1),
  itinerary: z.array(aiItineraryDaySchema).min(1),
  mapLocations: z.array(aiMapLocationSchema).default([]),
  tips: z.array(z.string()).default([]),
});
