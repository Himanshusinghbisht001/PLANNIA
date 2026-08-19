import { Request, Response } from 'express';
import { Itinerary } from '../models/Itinerary.model';
import { Errors } from '../utils/AppError';

/**
 * GET /api/trips/:tripId/itinerary
 * Get the full itinerary for a trip, sorted by day number.
 * SECURITY: userId is used as the ownership check — only the trip owner can access.
 */
export async function getItinerary(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const { tripId } = req.params;

  const itinerary = await Itinerary.find({ tripId, userId }).sort({ dayNumber: 1 });

  if (!itinerary.length) {
    throw Errors.notFound('Itinerary');
  }

  res.status(200).json({
    success: true,
    data: { itinerary },
  });
}
