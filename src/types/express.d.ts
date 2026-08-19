import { AuthObject } from '@clerk/express';

/**
 * Augment the Express Request interface to include
 * the Clerk auth object injected by requireAuth middleware.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Clerk auth object. Only present on routes protected by
       * requireAuth() middleware. Never trust userId from req.body.
       */
      auth: AuthObject;
      /**
       * Raw body buffer — only populated on webhook routes
       * for Stripe/Clerk signature verification.
       */
      rawBody?: Buffer;
    }
  }
}

export {};
