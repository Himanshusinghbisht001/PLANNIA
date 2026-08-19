import { Request, Response } from 'express';
import * as tripService from '../services/trip.service';
import { CreateTripInput } from '../validators/trip.validator';

/**
 * POST /api/trips
 * Create a new trip and trigger AI generation.
 * The userId is always taken from req.auth — never from req.body.
 */
export async function createTrip(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const input = req.body as CreateTripInput;

  const trip = await tripService.createTripWithAI(input, userId);

  res.status(201).json({
    success: true,
    data: { trip },
  });
}

/**
 * GET /api/trips
 * Get all trips for the authenticated user, paginated.
 */
export async function getTrips(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const { page = 1, limit = 10 } = req.query as unknown as { page: number; limit: number };

  const result = await tripService.getTripsByUser({ userId, page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
}

/**
 * GET /api/trips/:tripId
 * Get a single trip. Ownership is verified in the service layer.
 */
export async function getTrip(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const tripId = req.params.tripId as string;

  const trip = await tripService.getTripById(tripId, userId);

  res.status(200).json({
    success: true,
    data: { trip },
  });
}

/**
 * DELETE /api/trips/:tripId
 * Delete a trip and all related data. Ownership is verified in the service layer.
 */
export async function deleteTrip(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const tripId = req.params.tripId as string;

  await tripService.deleteTripById(tripId, userId);

  res.status(200).json({
    success: true,
    data: { message: 'Trip deleted successfully.' },
  });
}
