import type { Request, Response } from 'express';

import {
  cancelStockTransfer,
  createStockTransfer,
  dispatchStockTransfer,
  getStockTransferById,
  listStockTransfers,
  receiveStockTransfer,
} from '../services/stockTransfer.service.js';

export const create = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const transfer = await createStockTransfer(
    request.body ?? {},
    request.auth!.userId,
  );

  response.status(201).json({ transfer });
};

export const list = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await listStockTransfers(request.query);
  response.status(200).json(result);
};

export const getById = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const transfer = await getStockTransferById(request.params.id);
  response.status(200).json({ transfer });
};

export const dispatch = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const transfer = await dispatchStockTransfer(
    request.params.id,
    request.auth!.userId,
  );

  response.status(200).json({ transfer });
};

export const receive = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const transfer = await receiveStockTransfer(
    request.params.id,
    request.auth!.userId,
  );

  response.status(200).json({ transfer });
};

export const cancel = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const transfer = await cancelStockTransfer(request.params.id);
  response.status(200).json({ transfer });
};
