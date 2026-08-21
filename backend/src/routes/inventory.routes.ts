import { Router } from 'express';

import { adjust, getByWarehouseAndProduct, list } from '../controllers/inventory.controller.js';
import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const inventoryRouter = Router();

const inventoryRoles = ['ADMIN', 'OPERATIONS_MANAGER', 'WAREHOUSE_OPERATOR'] as const;

inventoryRouter.use(requireAuthentication);

inventoryRouter.get('/', requireRoles(...inventoryRoles), list);
inventoryRouter.get('/:warehouseId/:productId', requireRoles(...inventoryRoles), getByWarehouseAndProduct);
inventoryRouter.post('/adjust', requireRoles(...inventoryRoles), adjust);
