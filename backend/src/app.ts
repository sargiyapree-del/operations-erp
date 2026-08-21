import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { customerRouter } from './routes/customer.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { productRouter } from './routes/product.routes.js';
import { warehouseRouter } from './routes/warehouse.routes.js';
import { workOrderRouter } from './routes/workOrder.routes.js';
import { stockTransferRouter } from './routes/stockTransfer.routes.js';
import { salesOrderRouter } from './routes/salesOrder.routes.js';

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
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/warehouses', warehouseRouter);
app.use('/api/work-orders', workOrderRouter);
app.use('/api/stock-transfers', stockTransferRouter);
app.use('/api/sales-orders', salesOrderRouter);


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