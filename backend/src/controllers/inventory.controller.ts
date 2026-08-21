import type { Request, Response } from 'express';

import { adjustInventory, getInventoryBalance, listInventory } from '../services/inventory.service.js';

export const list = async (request: Request, response: Response): Promise<void> => {
  const result = await listInventory(request.query);
  response.status(200).json(result);
};

export const getByWarehouseAndProduct = async (request: Request, response: Response): Promise<void> => {
  const balance = await getInventoryBalance(request.params.warehouseId, request.params.productId);
  response.status(200).json({ balance });
};

export const adjust = async (request: Request, response: Response): Promise<void> => {
  if (!request.auth) {
    response.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  const result = await adjustInventory(request.body ?? {}, request.auth.userId);
  response.status(200).json(result);
};
