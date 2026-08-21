import type { Request, Response } from 'express';

import { createProduct, getProductById, listProducts, updateProduct } from '../services/product.service.js';

export const create = async (request: Request, response: Response): Promise<void> => {
  const product = await createProduct(request.body ?? {});
  response.status(201).json({ product });
};

export const list = async (request: Request, response: Response): Promise<void> => {
  const result = await listProducts(request.query);
  response.status(200).json(result);
};

export const getById = async (request: Request, response: Response): Promise<void> => {
  const product = await getProductById(request.params.id);
  response.status(200).json({ product });
};

export const update = async (request: Request, response: Response): Promise<void> => {
  const product = await updateProduct(request.params.id, request.body ?? {});
  response.status(200).json({ product });
};
