import type { Request, Response } from 'express';

import {
  completeWorkOrder,
  createWorkOrder,
  getWorkOrderById,
  listWorkOrders,
  releaseWorkOrder,
  startWorkOrder,
  updateWorkOrder,
} from '../services/workOrder.service.js';

export const create = async (request: Request, response: Response): Promise<void> => {
  const workOrder = await createWorkOrder(
    request.body ?? {},
    request.auth!.userId,
  );

  response.status(201).json({ workOrder });
};

export const list = async (request: Request, response: Response): Promise<void> => {
  const result = await listWorkOrders(request.query);
  response.status(200).json(result);
};

export const getById = async (request: Request, response: Response): Promise<void> => {
  const workOrder = await getWorkOrderById(request.params.id);
  response.status(200).json({ workOrder });
};

export const update = async (request: Request, response: Response): Promise<void> => {
  const workOrder = await updateWorkOrder(
    request.params.id,
    request.body ?? {},
  );

  response.status(200).json({ workOrder });
};

export const release = async (request: Request, response: Response): Promise<void> => {
  const workOrder = await releaseWorkOrder(request.params.id);
  response.status(200).json({ workOrder });
};

export const start = async (request: Request, response: Response): Promise<void> => {
  const workOrder = await startWorkOrder(request.params.id);
  response.status(200).json({ workOrder });
};

export const complete = async (request: Request, response: Response): Promise<void> => {
  const workOrder = await completeWorkOrder(
    request.params.id,
    request.auth!.userId,
  );

  response.status(200).json({ workOrder });
};
