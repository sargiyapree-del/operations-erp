import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.info(`Operations ERP API listening on port ${env.port}.`);
});

const shutdown = (signal: string) => {
  console.info(`${signal} received. Shutting down gracefully.`);
  server.close((error) => {
    if (error) {
      console.error('Server shutdown failed.', error);
      process.exitCode = 1;
    }

    process.exit();
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
