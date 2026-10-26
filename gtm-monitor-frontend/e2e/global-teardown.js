import path from 'path';
import { fileURLToPath } from 'url';
import { stopInfra } from './infra.js';

// Cabut sesi login yang dibuat selama uji (userAgent Chrome dari Playwright = HeadlessChrome)
async function revokeE2eSessions() {
  const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gtm-monitor-backend');
  process.loadEnvFile(path.join(backendDir, '.env'));
  const { PrismaClient } = await import(`file://${path.join(backendDir, 'node_modules/@prisma/client/index.js').replace(/\\/g, '/')}`);
  const prisma = new PrismaClient();
  try {
    await prisma.authSession.updateMany({
      where: { userAgent: { contains: 'HeadlessChrome' }, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' }
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalTeardown() {
  await revokeE2eSessions().catch(e => console.error('Gagal mencabut sesi uji E2E:', e.message));
  stopInfra();
}
