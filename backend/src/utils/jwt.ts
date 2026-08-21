import type { UserRole } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: UserRole;
};

export class InvalidTokenError extends Error {
  constructor() {
    super('Invalid or expired authentication token.');
  }
}

export const createAccessToken = (payload: AuthenticatedUser): string =>
  jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): AuthenticatedUser => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    if (
      typeof decoded === 'string' ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.email !== 'string' ||
      !isUserRole(decoded.role)
    ) {
      throw new InvalidTokenError();
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      throw error;
    }

    throw new InvalidTokenError();
  }
};

const isUserRole = (value: unknown): value is UserRole =>
  value === 'ADMIN' ||
  value === 'OPERATIONS_MANAGER' ||
  value === 'WAREHOUSE_OPERATOR' ||
  value === 'SALES_USER';
