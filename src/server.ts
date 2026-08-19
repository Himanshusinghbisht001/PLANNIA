import 'express-async-errors';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { clerkMiddleware } from '@clerk/express';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import itineraryRouter from './routes/itinerary.routes';
import subscriptionRouter from './routes/subscription.routes';
import tripRouter from './routes/trip.routes';
import userRouter from './routes/user.routes';
import webhookRouter from './routes/webhook.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(clerkMiddleware());

app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use('/api/webhooks', (req: Request, _res: Response, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
  }
  next();
});
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/api/users', userRouter);
app.use('/api/trips', tripRouter);
app.use('/api/itinerary', itineraryRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/webhooks', webhookRouter);

app.use(errorMiddleware);

async function startServer(): Promise<void> {
  await connectDB();
  const server = app.listen(Number(env.PORT), () => {
    console.log(`PLANNIA server listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received. Shutting down gracefully.`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

startServer().catch((error: unknown) => {
  console.error('Failed to start PLANNIA server.', error);
  process.exit(1);
});
