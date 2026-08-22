import { Router } from 'express';

import {
  create,
  getById,
  list,
  update,
} from '../controllers/warehouse.controller.js';
import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const warehouseRouter = Router();
const warehouseViewRoles = [
  'ADMIN',
  'OPERATIONS_MANAGER',
  'WAREHOUSE_OPERATOR',
  'SALES_USER',
] as const;
const warehouseManageRoles = ['ADMIN', 'OPERATIONS_MANAGER'] as const;

warehouseRouter.use(requireAuthentication);

warehouseRouter.post('/', requireRoles(...warehouseManageRoles), create);
warehouseRouter.get('/', requireRoles(...warehouseViewRoles), list);
warehouseRouter.get('/:id', requireRoles(...warehouseViewRoles), getById);
warehouseRouter.patch('/:id', requireRoles(...warehouseManageRoles), update);
