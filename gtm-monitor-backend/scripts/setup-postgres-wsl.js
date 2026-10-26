// Setup sekali jalan database UJI lokal di WSL Ubuntu: PostgreSQL 18 + PostGIS (versi sama dengan Neon) di belakang
// PgBouncer mode transaction (meniru pooled connection Neon). Dipakai test suite "database" (migrasi, import transaksional,
// query spasial, materialized view) agar uji yang menulis data tidak pernah menyentuh database Neon.
// Aman dijalankan ulang (idempoten).
//   node gtm-monitor-backend/scripts/setup-postgres-wsl.js        (dari folder root, PowerShell / terminal biasa)
// Hasil: cluster 18/main di port 5433, PgBouncer di port 6433, role "gtm" + database "gtm_test",
//        dan TEST_DATABASE_URL (lewat PgBouncer) & TEST_DIRECT_URL (langsung) di .env.
// Port 5432 sengaja tidak dipakai agar tidak bentrok dengan PostgreSQL yang mungkin terpasang di Windows.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const DISTRO = process.env.POSTGRES_WSL_DISTRO || 'Ubuntu';
const PG_VERSION = 18;
const PG_PORT = 5433;
const BOUNCER_PORT = 6433;
const ROLE = 'gtm';
const DATABASE = 'gtm_test';
const ENV_PATH = path.resolve(__dirname, '..', '.env');

// Password lama dipakai ulang agar menjalankan ulang skrip tidak memutus konfigurasi yang sudah ada
const envText = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
const existing = /^TEST_DIRECT_URL=["']?postgresql:\/\/[^:]+:([^@]+)@/m.exec(envText);
const PASSWORD = existing && existing[1] !== 'PASSWORD' ? decodeURIComponent(existing[1]) : crypto.randomBytes(18).toString('hex');

const SETUP_SCRIPT = `
set -e
export DEBIAN_FRONTEND=noninteractive
MISSING=""
for p in postgresql-${PG_VERSION} postgresql-${PG_VERSION}-postgis-3 pgbouncer; do
  dpkg -s "$p" >/dev/null 2>&1 || MISSING="$MISSING $p"
done
if [ -n "$MISSING" ]; then
  echo "Memasang$MISSING ..."
  apt-get update -qq >/dev/null
  apt-get install -y -qq $MISSING >/dev/null
fi
# PostgreSQL & PgBouncer dijalankan oleh launcher (scripts/postgres-wsl.js), bukan layanan bawaan
systemctl disable --now postgresql pgbouncer >/dev/null 2>&1 || true

CONF=/etc/postgresql/${PG_VERSION}/main/postgresql.conf
sed -i -E "s/^#?port = [0-9]+/port = ${PG_PORT}/" "$CONF"
sed -i -E "s/^#?listen_addresses = .*/listen_addresses = '127.0.0.1'/" "$CONF"
pg_ctlcluster ${PG_VERSION} main status >/dev/null 2>&1 || pg_ctlcluster --skip-systemctl-redirect ${PG_VERSION} main start

# Role uji superuser: test suite me-reset database (DROP SCHEMA) lalu menjalankan ulang seluruh migrasi,
# termasuk CREATE EXTENSION postgis
su postgres -c "psql -q -p ${PG_PORT} -v ON_ERROR_STOP=1" <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ROLE}') THEN
    CREATE ROLE ${ROLE} LOGIN SUPERUSER PASSWORD '${PASSWORD}';
  ELSE
    ALTER ROLE ${ROLE} LOGIN SUPERUSER PASSWORD '${PASSWORD}';
  END IF;
END $$;
SQL
su postgres -c "psql -p ${PG_PORT} -tAc \\"SELECT 1 FROM pg_database WHERE datname = '${DATABASE}'\\"" | grep -q 1 \\
  || su postgres -c "createdb -p ${PG_PORT} -O ${ROLE} ${DATABASE}"

# PgBouncer mode transaction seperti pooler Neon. max_prepared_statements = 0 (paling ketat):
# klien harus memakai pgbouncer=true agar tidak bergantung pada prepared statement di server
SECRET=$(su postgres -c "psql -p ${PG_PORT} -tAc \\"SELECT rolpassword FROM pg_authid WHERE rolname = '${ROLE}'\\"")
printf '"%s" "%s"\\n' "${ROLE}" "$SECRET" > /etc/pgbouncer/userlist.txt
cat > /etc/pgbouncer/pgbouncer.ini <<CONF
[databases]
* = host=127.0.0.1 port=${PG_PORT}

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = ${BOUNCER_PORT}
unix_socket_dir =
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 10
max_prepared_statements = 0
ignore_startup_parameters = extra_float_digits,options
logfile = /var/log/postgresql/pgbouncer.log
pidfile =
CONF
chown postgres:postgres /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/userlist.txt
pg_ctlcluster --skip-systemctl-redirect ${PG_VERSION} main stop
echo "PostgreSQL $(su postgres -c 'psql --version' | awk '{print $3}') + PostGIS $(dpkg -s postgresql-${PG_VERSION}-postgis-3 | awk '/^Version/ {print $2}') + PgBouncer $(pgbouncer --version | head -1 | awk '{print $2}') siap"
`;

const run = spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--', 'bash', '-s'], {
  input: SETUP_SCRIPT.replace(/\r\n/g, '\n'),
  encoding: 'utf8',
  windowsHide: true
});
console.log(`${run.stdout || ''}${run.stderr || ''}`.replace(/\0/g, '').trim());
if (run.status !== 0) {
  console.error('❌ Setup PostgreSQL uji gagal. Pastikan WSL Ubuntu aktif & terhubung internet.');
  process.exit(1);
}

// Tulis / perbarui TEST_* di .env (baris lain tidak diubah)
const credentials = `${ROLE}:${encodeURIComponent(PASSWORD)}`;
const values = {
  TEST_DATABASE_URL: `postgresql://${credentials}@127.0.0.1:${BOUNCER_PORT}/${DATABASE}?pgbouncer=true`,
  TEST_DIRECT_URL: `postgresql://${credentials}@127.0.0.1:${PG_PORT}/${DATABASE}`
};
let env = envText;
const eol = env.includes('\r\n') ? '\r\n' : '\n';
const missing = [];
for (const [key, value] of Object.entries(values)) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(env)) env = env.replace(pattern, line);
  else missing.push(line);
}
if (missing.length) {
  env = `${env.replace(/\s*$/, '')}${eol}${eol}# === DATABASE UJI LOKAL (WSL: PostgreSQL + PostGIS di belakang PgBouncer) — hanya untuk npm test ===${eol}${missing.join(eol)}${eol}`;
}
fs.writeFileSync(ENV_PATH, env);
console.log(`✅ Database uji siap: PgBouncer 127.0.0.1:${BOUNCER_PORT} → PostgreSQL 127.0.0.1:${PG_PORT}/${DATABASE}; TEST_DATABASE_URL & TEST_DIRECT_URL tersimpan di .env`);
