import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { tripParamsSchema } from '../validators/trip.validator';
import { asyncHandler } from '../utils/asyncHandler';
import * as itineraryController from '../controllers/itinerary.controller';

/**
 * Mounted at /api/trips/:tripId/itinerary via trip.routes.ts
 * Uses mergeParams: true so :tripId is accessible in this router.
 */
const router = Router({ mergeParams: true });

/**
 * GET /api/trips/:tripId/itinerary
 * Get the day-wise itinerary for a trip.
 * Ownership verified via userId in the controller.
 */
router.get(
  '/',
  authMiddleware,
  validate(tripParamsSchema, 'params'),
  asyncHandler(itineraryController.getItinerary),
);

export default router;
