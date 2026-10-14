const path = require('path');

// Muat kredensial dari .env (ADMIN_USERNAME, ADMIN_PASSWORD, DATABASE_URL)
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // .env tidak ada: gunakan environment variable sistem
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || '').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi di file .env (lihat .env.example).');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Updating Admin credentials...");
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (admin) {
    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: {
        username: ADMIN_USERNAME,
        password: hashedPassword
      }
    });
    console.log(`✅ Admin account updated successfully!`);
    console.log(`   - Username: ${updated.username}`);
    console.log(`   - Full Name: ${updated.fullName}`);
    console.log(`   - Role: ${updated.role}`);
  } else {
    const created = await prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        password: hashedPassword,
        fullName: 'Administrator Pusat GTM',
        role: 'ADMIN',
        branchId: null
      }
    });
    console.log(`✅ Admin account created successfully!`);
    console.log(`   - Username: ${created.username}`);
    console.log(`   - Full Name: ${created.fullName}`);
    console.log(`   - Role: ${created.role}`);
  }
}

main()
  .catch(err => {
    console.error("❌ Error updating admin account:", err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
