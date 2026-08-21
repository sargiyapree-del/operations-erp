import type { Request, Response } from 'express';

import { getCurrentUser, loginUser, registerUser } from '../services/auth.service.js';

export const register = async (request: Request, response: Response): Promise<void> => {
  const result = await registerUser(request.body ?? {});
  response.status(201).json(result);
};

export const login = async (request: Request, response: Response): Promise<void> => {
  const result = await loginUser(request.body ?? {});
  response.status(200).json(result);
};

export const me = async (request: Request, response: Response): Promise<void> => {
  if (!request.auth) {
    response.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  const user = await getCurrentUser(request.auth.userId);
  response.status(200).json({ user });
};
