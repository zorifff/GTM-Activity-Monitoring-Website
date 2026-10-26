// Satu instance PrismaClient untuk seluruh aplikasi, terhubung lewat connection pooler (Neon PgBouncer mode transaction)
require('../config/env');
const { PrismaClient } = require('@prisma/client');
const { buildDatasourceUrl } = require('../config/database');

let datasourceUrl;
if (process.env.DATABASE_URL) {
  const config = buildDatasourceUrl(process.env.DATABASE_URL);
  datasourceUrl = config.url;
  if (!config.pooled) {
    console.warn('⚠️ [Database] DATABASE_URL tidak melewati connection pooler. Untuk Neon gunakan host "-pooler" (Dashboard → Connect → Connection pooling).');
  }
}

const prisma = new PrismaClient(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined);

module.exports = prisma;
