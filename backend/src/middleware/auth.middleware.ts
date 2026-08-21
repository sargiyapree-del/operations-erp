import type { NextFunction, Request, Response } from 'express';

import { InvalidTokenError, type AuthenticatedUser, verifyAccessToken } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

export const requireAuthentication = (request: Request, response: Response, next: NextFunction): void => {
  const authorization = request.header('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    response.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  try {
    request.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      response.status(401).json({ message: error.message });
      return;
    }

    next(error);
  }
};
