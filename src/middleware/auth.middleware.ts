import { requireAuth } from '@clerk/express';

/**
 * Clerk authentication middleware.
 *
 * Verifies the Clerk session JWT from the Authorization header.
 * Attaches `req.auth` (including `req.auth.userId`) to the request.
 *
 * SECURITY: Never trust a userId sent by the browser in req.body.
 * Always use req.auth.userId which is extracted from the verified JWT.
 *
 * Usage:
 *   router.get('/trips', authMiddleware, tripController.getTrips)
 */
export const authMiddleware = requireAuth();
