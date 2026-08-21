import type { Request, Response } from 'express';

import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
} from '../services/customer.service.js';

export const create = async (request: Request, response: Response): Promise<void> => {
  const customer = await createCustomer(request.body ?? {});
  response.status(201).json({ customer });
};

export const list = async (request: Request, response: Response): Promise<void> => {
  const result = await listCustomers(request.query);
  response.status(200).json(result);
};

export const getById = async (request: Request, response: Response): Promise<void> => {
  const customer = await getCustomerById(request.params.id);
  response.status(200).json({ customer });
};

export const update = async (request: Request, response: Response): Promise<void> => {
  const customer = await updateCustomer(request.params.id, request.body ?? {});
  response.status(200).json({ customer });
};

export const remove = async (request: Request, response: Response): Promise<void> => {
  await deleteCustomer(request.params.id);
  response.status(204).send();
};
