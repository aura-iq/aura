import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { prisma } from './src/config/prisma.js';

async function main() {
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log('[AURA] API listening on http://localhost:' + env.port);
  });

  const shutdown = async (sig) => {
    console.log(sig + ' received, shutting down...');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
