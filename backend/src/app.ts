import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.use((_request, response) => {
  response.status(404).json({
    message: 'Route not found.'
  });
});
