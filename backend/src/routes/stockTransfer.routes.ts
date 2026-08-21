import { Router } from 'express';

import {
  cancel,
  create,
  dispatch,
  getById,
  list,
  receive,
} from '../controllers/stockTransfer.controller.js';

import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const stockTransferRouter = Router();

const viewRoles = [
  'ADMIN',
  'OPERATIONS_MANAGER',
  'WAREHOUSE_OPERATOR',
] as const;

const manageRoles = [
  'ADMIN',
  'OPERATIONS_MANAGER',
] as const;

stockTransferRouter.use(requireAuthentication);

stockTransferRouter.post(
  '/',
  requireRoles(...manageRoles),
  create,
);

stockTransferRouter.get(
  '/',
  requireRoles(...viewRoles),
  list,
);

stockTransferRouter.get(
  '/:id',
  requireRoles(...viewRoles),
  getById,
);

stockTransferRouter.post(
  '/:id/dispatch',
  requireRoles(...manageRoles),
  dispatch,
);

stockTransferRouter.post(
  '/:id/receive',
  requireRoles(...viewRoles),
  receive,
);

stockTransferRouter.post(
  '/:id/cancel',
  requireRoles(...manageRoles),
  cancel,
);
