import arcjet, { tokenBucket, slidingWindow, shield } from '@arcjet/node';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { Errors } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Create a configured Arcjet instance.
 * Shield detects automated attacks (bots, scrapers).
 */
const aj = arcjet({
  key: env.ARCJET_KEY,
  characteristics: ['fingerprint'],
  rules: [
    shield({ mode: 'LIVE' }),
  ],
});

/**
 * Arcjet middleware factory.
 *
 * Creates route-specific Arcjet middleware with the given rate-limit rules.
 * The decision is always made server-side — never trust client claims.
 *
 * @param rules - Arcjet rate limit / shield rules to apply
 */

/**
 * Strict rate limiter for AI generation routes.
 * 5 requests per minute per authenticated user.
 */
const aiGenerationAJ = aj.withRule(
  slidingWindow({
    mode: 'LIVE',
    interval: '1m',
    max: 5,
  }),
);

/**
 * Auth route rate limiter — prevent brute-force on login/register.
 * 10 requests per minute per IP.
 */
const authRateLimitAJ = aj.withRule(
  slidingWindow({
    mode: 'LIVE',
    interval: '1m',
    max: 10,
  }),
);

/**
 * Contact form limiter — 3 submissions per 10 minutes per IP.
 */
const contactFormAJ = aj.withRule(
  tokenBucket({
    mode: 'LIVE',
    refillRate: 3,
    interval: '10m',
    capacity: 3,
  }),
);

/**
 * General API limiter — applied to all other protected routes.
 */
const generalAJ = aj.withRule(
  tokenBucket({
    mode: 'LIVE',
    refillRate: 30,
    interval: '1m',
    capacity: 60,
  }),
);

/** Helper: convert Arcjet decision to Express middleware response */
async function applyArcjet(
  instance: typeof aiGenerationAJ,
  req: Request,
  next: NextFunction,
  fingerprint: string,
): Promise<void> {
  const decision = await instance.protect(req, { fingerprint });

  if (decision.isDenied()) {
    logger.warn('Arcjet blocked request', {
      operation: 'arcjet_block',
      reason: decision.reason?.toString(),
      ip: req.ip,
    });

    if (decision.reason?.isRateLimit?.()) {
      next(Errors.tooManyRequests());
    } else {
      next(Errors.forbidden('Request blocked by security controls.'));
    }
    return;
  }

  next();
}

/**
 * Express middleware: rate-limit AI trip generation requests.
 * Uses authenticated userId as the fingerprint so limits are per-user.
 */
export function aiRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const fingerprint = req.auth?.userId ?? req.ip ?? 'anonymous';
  applyArcjet(aiGenerationAJ, req, next, fingerprint).catch(next);
}

/**
 * Express middleware: rate-limit authentication-related routes.
 */
export function authRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const fingerprint = req.ip ?? 'anonymous';
  applyArcjet(authRateLimitAJ, req, next, fingerprint).catch(next);
}

/**
 * Express middleware: rate-limit contact form submissions.
 */
export function contactRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const fingerprint = req.ip ?? 'anonymous';
  applyArcjet(contactFormAJ, req, next, fingerprint).catch(next);
}

/**
 * Express middleware: general API rate limit.
 */
export function generalRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const fingerprint = req.auth?.userId ?? req.ip ?? 'anonymous';
  applyArcjet(generalAJ, req, next, fingerprint).catch(next);
}
