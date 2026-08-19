import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { aiRateLimit, generalRateLimit } from '../middleware/arcjet.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTripSchema,
  tripParamsSchema,
  tripsQuerySchema,
} from '../validators/trip.validator';
import { asyncHandler } from '../utils/asyncHandler';
import * as tripController from '../controllers/trip.controller';
import itineraryRouter from './itinerary.routes';

const router = Router();

/**
 * POST /api/trips
 * Create a trip + trigger AI generation.
 * Protected by auth + strict AI rate limit + input validation.
 */
router.post(
  '/',
  authMiddleware,
  aiRateLimit,
  validate(createTripSchema),
  asyncHandler(tripController.createTrip),
);

/**
 * GET /api/trips
 * Get paginated list of trips for the authenticated user.
 */
router.get(
  '/',
  authMiddleware,
  generalRateLimit,
  validate(tripsQuerySchema, 'query'),
  asyncHandler(tripController.getTrips),
);

/**
 * GET /api/trips/:tripId
 * Get a single trip by ID. Ownership enforced in service.
 */
router.get(
  '/:tripId',
  authMiddleware,
  generalRateLimit,
  validate(tripParamsSchema, 'params'),
  asyncHandler(tripController.getTrip),
);

/**
 * DELETE /api/trips/:tripId
 * Delete a trip and all related data. Ownership enforced in service.
 */
router.delete(
  '/:tripId',
  authMiddleware,
  generalRateLimit,
  validate(tripParamsSchema, 'params'),
  asyncHandler(tripController.deleteTrip),
);

// Nest itinerary routes under /:tripId
router.use('/:tripId/itinerary', itineraryRouter);

export default router;
