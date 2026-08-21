import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
  }),
);
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.use((_request, response) => {
  response.status(404).json({
    message: 'Route not found.',
  });
});

app.use(
  (
    error: Error & { statusCode?: number },
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      console.error(error);
    }

    response.status(statusCode).json({
      message: statusCode >= 500 ? 'Internal server error.' : error.message,
    });
  },
);
