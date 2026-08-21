import type { Request, Response } from 'express';

import {
  createSalesOrder,
  listSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  fulfillSalesOrder,
  assignWarehouseToSalesOrder,
} from '../services/salesOrder.service.js';

export const create = async (request: Request, response: Response): Promise<void> => {
  const salesOrder = await createSalesOrder(
    request.body ?? {},
    request.auth!.userId,
  );

  response.status(201).json({ salesOrder });
};

export const list = async (request: Request, response: Response): Promise<void> => {
  const result = await listSalesOrders(request.query);
  response.status(200).json(result);
};

export const getById = async (request: Request, response: Response): Promise<void> => {
  const salesOrder = await getSalesOrderById(request.params.id);
  response.status(200).json({ salesOrder });
};

export const confirm = async (request: Request, response: Response): Promise<void> => {
  const salesOrder = await confirmSalesOrder(request.params.id);
  response.status(200).json({ salesOrder });
};

export const fulfill = async (request: Request, response: Response): Promise<void> => {
  const salesOrder = await fulfillSalesOrder(
    request.params.id,
    request.auth!.userId,
  );

  response.status(200).json({ salesOrder });
};

export const assignWarehouse = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const salesOrder = await assignWarehouseToSalesOrder(
    request.params.id,
    request.body?.warehouseId,
  );

  response.status(200).json({ salesOrder });
};