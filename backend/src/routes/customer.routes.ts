import { Router } from 'express';

import { create, getById, list, remove, update } from '../controllers/customer.controller.js';
import { requireAuthentication, requireRoles } from '../middleware/auth.middleware.js';

export const customerRouter = Router();

const crmRoles = ['ADMIN', 'OPERATIONS_MANAGER', 'SALES_USER'] as const;
const customerManagerRoles = ['ADMIN', 'OPERATIONS_MANAGER'] as const;

customerRouter.use(requireAuthentication);

customerRouter.post('/', requireRoles(...crmRoles), create);
customerRouter.get('/', requireRoles(...crmRoles), list);
customerRouter.get('/:id', requireRoles(...crmRoles), getById);
customerRouter.patch('/:id', requireRoles(...crmRoles), update);
customerRouter.delete('/:id', requireRoles(...customerManagerRoles), remove);
