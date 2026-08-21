import { Router } from 'express';

import { create, getById, list, update } from '../controllers/product.controller.js';
import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const productRouter = Router();

const productViewRoles = ['ADMIN', 'OPERATIONS_MANAGER', 'SALES_USER'] as const;
const productManageRoles = ['ADMIN', 'OPERATIONS_MANAGER'] as const;

productRouter.use(requireAuthentication);

productRouter.post('/', requireRoles(...productManageRoles), create);
productRouter.get('/', requireRoles(...productViewRoles), list);
productRouter.get('/:id', requireRoles(...productViewRoles), getById);
productRouter.patch('/:id', requireRoles(...productManageRoles), update);
