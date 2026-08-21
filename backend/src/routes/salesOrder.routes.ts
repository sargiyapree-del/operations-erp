import { Router } from 'express';

import {
  create,
  list,
  getById,
  confirm,
  fulfill,
  assignWarehouse,
} from '../controllers/salesOrder.controller.js';

import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const salesOrderRouter = Router();

const viewRoles = ['ADMIN', 'OPERATIONS_MANAGER', 'WAREHOUSE_OPERATOR'] as const;
const manageRoles = ['ADMIN', 'OPERATIONS_MANAGER'] as const;

salesOrderRouter.use(requireAuthentication);

salesOrderRouter.post('/', requireRoles(...manageRoles), create);
salesOrderRouter.get('/', requireRoles(...viewRoles), list);
salesOrderRouter.get('/:id', requireRoles(...viewRoles), getById);

salesOrderRouter.post('/:id/confirm', requireRoles(...manageRoles), confirm);
salesOrderRouter.post('/:id/fulfill', requireRoles(...manageRoles), fulfill);
salesOrderRouter.post(
  '/:id/assign-warehouse',
  requireRoles(...manageRoles),
  assignWarehouse,
);