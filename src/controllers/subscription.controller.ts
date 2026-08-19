import { Request, Response } from 'express';
import Stripe from 'stripe';
import * as subscriptionService from '../services/subscription.service';
import { stripe } from '../services/subscription.service';
import { env } from '../config/env';
import { Errors } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * GET /api/subscriptions/me
 * Return the authenticated user's subscription status.
 */
export async function getMySubscription(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const subscription = await subscriptionService.getSubscription(userId);

  res.status(200).json({
    success: true,
    data: {
      subscription: subscription ?? {
        plan: 'free',
        status: 'active',
      },
    },
  });
}

/**
 * POST /api/subscriptions/checkout
 * Create a Stripe Checkout session URL and return it.
 * SECURITY: Never trust client-provided subscription status.
 */
export async function createCheckout(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  // Email is passed from the frontend (already verified user context)
  const { email, successUrl, cancelUrl } = req.body as {
    email: string;
    successUrl: string;
    cancelUrl: string;
  };

  if (!email || !successUrl || !cancelUrl) {
    throw Errors.badRequest('email, successUrl, and cancelUrl are required.', 'MISSING_FIELDS');
  }

  const url = await subscriptionService.createCheckoutSession(
    userId,
    email,
    successUrl,
    cancelUrl,
  );

  res.status(200).json({
    success: true,
    data: { url },
  });
}

/**
 * POST /api/subscriptions/portal
 * Create a Stripe Billing Portal session URL and return it.
 */
export async function createPortal(req: Request, res: Response): Promise<void> {
  const userId = req.auth.userId!;
  const { returnUrl } = req.body as { returnUrl: string };

  if (!returnUrl) {
    throw Errors.badRequest('returnUrl is required.', 'MISSING_FIELDS');
  }

  const url = await subscriptionService.createPortalSession(userId, returnUrl);

  res.status(200).json({
    success: true,
    data: { url },
  });
}

/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler.
 *
 * SECURITY: Signature is verified using the raw body and STRIPE_WEBHOOK_SECRET.
 * Only after a valid signature is the event processed.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];

  if (!sig || !req.rawBody) {
    throw Errors.badRequest('Missing stripe-signature header or raw body.', 'WEBHOOK_INVALID');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', {
      operation: 'stripe_webhook',
      message: err instanceof Error ? err.message : 'Unknown',
    });
    throw Errors.badRequest('Webhook signature verification failed.', 'WEBHOOK_SIGNATURE_INVALID');
  }

  await subscriptionService.handleStripeWebhook(event);

  // Return 200 quickly so Stripe doesn't retry
  res.status(200).json({ received: true });
}

/**
 * POST /api/webhooks/clerk
 * Clerk webhook handler — sync user data on user.created / user.updated.
 *
 * SECURITY: Signature is verified using svix.
 */
export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  const { Webhook } = await import('svix');

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature || !req.rawBody) {
    throw Errors.badRequest('Missing svix headers or raw body.', 'WEBHOOK_INVALID');
  }

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let payload: {
    type: string;
    data: {
      id: string;
      first_name: string;
      last_name: string;
      email_addresses: { email_address: string }[];
      image_url: string;
    };
  };

  try {
    payload = wh.verify(req.rawBody.toString(), {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof payload;
  } catch (err) {
    logger.warn('Clerk webhook signature verification failed', {
      operation: 'clerk_webhook',
      message: err instanceof Error ? err.message : 'Unknown',
    });
    throw Errors.badRequest('Webhook signature verification failed.', 'WEBHOOK_SIGNATURE_INVALID');
  }

  const { type, data } = payload;

  if (type === 'user.created' || type === 'user.updated') {
    const { syncUser } = await import('../services/user.service');
    await syncUser({
      clerkUserId: data.id,
      name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'User',
      email: data.email_addresses[0]?.email_address ?? '',
      imageUrl: data.image_url,
    });
    logger.info(`Clerk webhook: user synced (${type})`, { operation: 'clerk_webhook' });
  }

  res.status(200).json({ received: true });
}
