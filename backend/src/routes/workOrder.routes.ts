import { Router } from 'express';

import {
  complete,
  create,
  getById,
  list,
  release,
  start,
  update,
} from '../controllers/workOrder.controller.js';

import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const workOrderRouter = Router();

const viewRoles = ['ADMIN', 'OPERATIONS_MANAGER', 'WAREHOUSE_OPERATOR'] as const;
const manageRoles = ['ADMIN', 'OPERATIONS_MANAGER'] as const;

workOrderRouter.use(requireAuthentication);

workOrderRouter.post('/', requireRoles(...manageRoles), create);
workOrderRouter.get('/', requireRoles(...viewRoles), list);
workOrderRouter.get('/:id', requireRoles(...viewRoles), getById);
workOrderRouter.patch('/:id', requireRoles(...manageRoles), update);

workOrderRouter.post('/:id/release', requireRoles(...manageRoles), release);
workOrderRouter.post('/:id/start', requireRoles(...viewRoles), start);
workOrderRouter.post('/:id/complete', requireRoles(...manageRoles), complete);
