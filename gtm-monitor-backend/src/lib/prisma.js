// Satu instance PrismaClient untuk seluruh aplikasi
require('../config/env');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient(process.env.DATABASE_URL ? {
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
} : undefined);

module.exports = prisma;
