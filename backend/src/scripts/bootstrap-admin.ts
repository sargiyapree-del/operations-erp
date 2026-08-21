import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../utils/password.js';

const prisma = new PrismaClient();

const bootstrapAdmin = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Admin bootstrap is allowed only in development.');
  }

  if (process.env.BOOTSTRAP_ADMIN_ENABLED !== 'true') {
    throw new Error('BOOTSTRAP_ADMIN_ENABLED must be true.');
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();

  if (!email || !password || !fullName) {
    throw new Error(
      'BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD and BOOTSTRAP_ADMIN_NAME must be set.',
    );
  }

  if (password.length < 8) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const passwordHash = await hashPassword(password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    console.log(`Admin user promoted: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Admin user created: ${email}`);
};

const main = async (): Promise<void> => {
  try {
    await bootstrapAdmin();
  } finally {
    await prisma.$disconnect();
  }
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});