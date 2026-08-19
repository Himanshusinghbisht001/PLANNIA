import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as subscriptionController from '../controllers/subscription.controller';

const router = Router();

/**
 * POST /api/webhooks/stripe
 *
 * IMPORTANT: This route must use raw body (Buffer) — NOT express.json().
 * The raw body middleware is applied selectively in app.ts for /api/webhooks/*
 * so Stripe can verify the HMAC signature.
 */
router.post(
  '/stripe',
  asyncHandler(subscriptionController.handleStripeWebhook),
);

/**
 * POST /api/webhooks/clerk
 *
 * IMPORTANT: Also requires raw body for svix signature verification.
 */
router.post(
  '/clerk',
  asyncHandler(subscriptionController.handleClerkWebhook),
);

export default router;
