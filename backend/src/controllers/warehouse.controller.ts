import type { Request, Response } from 'express';

import {
  createWarehouse,
  getWarehouseById,
  listWarehouses,
  updateWarehouse,
} from '../services/warehouse.service.js';

export const create = async (request: Request, response: Response): Promise<void> => {
  const warehouse = await createWarehouse(request.body ?? {});
  response.status(201).json({ warehouse });
};

export const list = async (request: Request, response: Response): Promise<void> => {
  const result = await listWarehouses(request.query);
  response.status(200).json(result);
};

export const getById = async (request: Request, response: Response): Promise<void> => {
  const warehouse = await getWarehouseById(request.params.id);
  response.status(200).json({ warehouse });
};

export const update = async (request: Request, response: Response): Promise<void> => {
  const warehouse = await updateWarehouse(request.params.id, request.body ?? {});
  response.status(200).json({ warehouse });
};
