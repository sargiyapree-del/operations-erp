import 'dotenv/config';

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be a valid TCP port number.');
  }

  return port;
};

const requireEnvironmentValue = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: requireEnvironmentValue('JWT_SECRET'),
  jwtExpiresIn: requireEnvironmentValue('JWT_EXPIRES_IN'),
};
