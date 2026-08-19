import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  operation?: string;
  status?: number | string;
  durationMs?: number;
  code?: string;
  [key: string]: unknown;
}

/**
 * Structured logger.
 *
 * Rules:
 * - Never log API keys, passwords, tokens, payment secrets.
 * - Always use safe error codes rather than raw internal error messages.
 * - In production, output JSON for log aggregators.
 * - In development, output human-readable format.
 */
function log(level: LogLevel, message: string, meta?: Partial<LogEntry>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (env.NODE_ENV === 'production') {
    // Structured JSON for log aggregators (Datadog, CloudWatch, etc.)
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = {
      info: '📘 INFO',
      warn: '⚠️  WARN',
      error: '❌ ERROR',
      debug: '🔍 DEBUG',
    }[level];

    const extras = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`${prefix} [${entry.timestamp}] ${message}${extras}`);
  }
}

export const logger = {
  info: (message: string, meta?: Partial<LogEntry>) => log('info', message, meta),
  warn: (message: string, meta?: Partial<LogEntry>) => log('warn', message, meta),
  error: (message: string, meta?: Partial<LogEntry>) => log('error', message, meta),
  debug: (message: string, meta?: Partial<LogEntry>) => {
    if (env.NODE_ENV !== 'production') log('debug', message, meta);
  },
};
