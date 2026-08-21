import { Prisma, PrismaClient, type User } from '@prisma/client';

import { createAccessToken, type AuthenticatedUser } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const prisma = new PrismaClient();
const MINIMUM_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SafeUser = Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'isActive' | 'createdAt' | 'updatedAt'>;

type AuthenticationResult = {
  token: string;
  user: SafeUser;
};

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createAuthenticationResult = (user: User): AuthenticationResult => {
  const payload: AuthenticatedUser = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    token: createAccessToken(payload),
    user: toSafeUser(user),
  };
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const validateRegistrationInput = (email: string, password: string, fullName: string): void => {
  if (!email || !password || !fullName) {
    throw new AuthServiceError('Email, password, and full name are required.', 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new AuthServiceError('Email must be valid.', 400);
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new AuthServiceError(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long.`, 400);
  }
};

export const registerUser = async (input: {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
}): Promise<AuthenticationResult> => {
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';

  validateRegistrationInput(email, password, fullName);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AuthServiceError('An account with this email already exists.', 409);
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        fullName,
        role: 'SALES_USER',
      },
    });

    return createAuthenticationResult(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AuthServiceError('An account with this email already exists.', 409);
    }

    throw error;
  }
};

export const loginUser = async (input: {
  email?: unknown;
  password?: unknown;
}): Promise<AuthenticationResult> => {
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email || !password) {
    throw new AuthServiceError('Email and password are required.', 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthServiceError('Invalid email or password.', 401);
  }

  return createAuthenticationResult(user);
};

export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.isActive) {
    throw new AuthServiceError('Authentication is no longer valid.', 401);
  }

  return toSafeUser(user);
};
