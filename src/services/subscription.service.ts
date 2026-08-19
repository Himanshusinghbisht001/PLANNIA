import Stripe from 'stripe';
import { env } from '../config/env';
import { Subscription, ISubscription } from '../models/Subscription.model';
import { User } from '../models/User.model';
import { Errors } from '../utils/AppError';
import { logger } from '../utils/logger';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

/**
 * Get subscription for a user.
 * If no subscription record exists, return a default free subscription object.
 */
export async function getSubscription(userId: string): Promise<ISubscription | null> {
  return Subscription.findOne({ userId });
}

/**
 * Create a Stripe Checkout session for upgrading to Pro.
 * SECURITY: Subscription state is managed server-side via webhooks — never trust client.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  // Find or create a Stripe customer
  let customerId: string;
  const existingSub = await Subscription.findOne({ userId });

  if (existingSub?.providerCustomerId) {
    customerId = existingSub.providerCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { clerkUserId: userId },
    });
    customerId = customer.id;

    // Persist the customer ID
    await Subscription.findOneAndUpdate(
      { userId },
      { $set: { providerCustomerId: customerId } },
      { upsert: true },
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: env.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { clerkUserId: userId },
  });

  if (!session.url) {
    throw Errors.badRequest('Failed to create checkout session.', 'CHECKOUT_SESSION_ERROR');
  }

  // Never log the session URL or customer ID — they are sensitive
  logger.info('Stripe checkout session created', { operation: 'create_checkout' });

  return session.url;
}

/**
 * Create a Stripe Billing Portal session for managing subscriptions.
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string,
): Promise<string> {
  const sub = await Subscription.findOne({ userId });
  if (!sub?.providerCustomerId) {
    throw Errors.badRequest('No active subscription found.', 'NO_SUBSCRIPTION');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.providerCustomerId,
    return_url: returnUrl,
  });

  logger.info('Stripe portal session created', { operation: 'create_portal' });
  return session.url;
}

/**
 * Handle Stripe webhook events.
 *
 * SECURITY: Signature is verified before this function is called.
 * Subscription state is ONLY updated via server-side webhook — never client claims.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;
      const subscriptionId = session.subscription as string;

      if (!clerkUserId || !subscriptionId) {
        logger.warn('Stripe webhook: missing metadata', {
          operation: 'stripe_webhook',
          eventType: event.type,
        });
        break;
      }

      // Fetch full subscription details from Stripe
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

      await Subscription.findOneAndUpdate(
        { userId: clerkUserId },
        {
          $set: {
            plan: 'pro',
            status: 'active',
            providerSubscriptionId: subscriptionId,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        },
        { upsert: true },
      );

      // Sync plan to User model
      await User.findOneAndUpdate(
        { clerkUserId },
        { $set: { subscriptionPlan: 'pro', subscriptionStatus: 'active' } },
      );

      logger.info('Subscription upgraded to Pro', { operation: 'stripe_webhook' });
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const clerkUserId = stripeSub.metadata?.clerkUserId;

      if (!clerkUserId) break;

      const status = mapStripeStatus(stripeSub.status);

      await Subscription.findOneAndUpdate(
        { userId: clerkUserId },
        {
          $set: {
            status,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        },
      );

      await User.findOneAndUpdate(
        { clerkUserId },
        { $set: { subscriptionStatus: status } },
      );

      logger.info('Subscription updated', { operation: 'stripe_webhook', status });
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const clerkUserId = stripeSub.metadata?.clerkUserId;

      if (!clerkUserId) break;

      await Subscription.findOneAndUpdate(
        { userId: clerkUserId },
        { $set: { plan: 'free', status: 'cancelled' } },
      );

      await User.findOneAndUpdate(
        { clerkUserId },
        { $set: { subscriptionPlan: 'free', subscriptionStatus: 'cancelled' } },
      );

      logger.info('Subscription cancelled — reverted to free', { operation: 'stripe_webhook' });
      break;
    }

    default:
      // Unhandled event types are silently ignored
      break;
  }
}

/**
 * Map Stripe subscription status to our internal status enum.
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' {
  const map: Record<string, 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired'> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    paused: 'past_due',
  };
  return map[stripeStatus] ?? 'expired';
}

export { stripe };
