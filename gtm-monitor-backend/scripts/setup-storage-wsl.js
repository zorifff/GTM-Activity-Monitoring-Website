// Setup sekali jalan object storage S3-compatible lokal (Garage) di WSL Ubuntu untuk foto verifikasi & file sementara.
// Aman dijalankan ulang (idempoten): binary, konfigurasi, layout, key & bucket yang sudah ada tidak dibuat ulang.
//   node gtm-monitor-backend/scripts/setup-storage-wsl.js        (dari folder root, PowerShell / terminal biasa)
// Hasil: /etc/garage.toml + data di /var/lib/garage (WSL), bucket "gtm-media", key "gtm-app", dan nilai S3_* di .env.
// Produksi dengan Cloudflare R2 / AWS S3: lewati skrip ini, isi S3_* di .env sesuai .env.example.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DISTRO = process.env.STORAGE_WSL_DISTRO || 'Ubuntu';
const GARAGE_VERSION = 'v2.1.0';
const BUCKET = 'gtm-media';
const KEY_NAME = 'gtm-app';
const S3_PORT = 3900;
const ENV_PATH = path.resolve(__dirname, '..', '.env');

const SETUP_SCRIPT = `
set -e
export GARAGE_CONFIG_FILE=/etc/garage.toml
if [ ! -x /usr/local/bin/garage ]; then
  echo "Mengunduh Garage ${GARAGE_VERSION}..."
  curl -fsSL -o /usr/local/bin/garage https://garagehq.deuxfleurs.fr/_releases/${GARAGE_VERSION}/x86_64-unknown-linux-musl/garage
  chmod +x /usr/local/bin/garage
fi
if [ ! -f /etc/garage.toml ]; then
  echo "Menulis /etc/garage.toml..."
  mkdir -p /var/lib/garage/meta /var/lib/garage/data
  cat > /etc/garage.toml <<CONF
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "127.0.0.1:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$(openssl rand -hex 32)"

[s3_api]
s3_region = "garage"
api_bind_addr = "127.0.0.1:${S3_PORT}"
root_domain = ".s3.garage.localhost"
CONF
  chmod 600 /etc/garage.toml
fi
STARTED=""
if ! garage status >/dev/null 2>&1; then
  garage server >/var/log/garage-setup.log 2>&1 &
  STARTED=$!
  for i in $(seq 1 30); do garage status >/dev/null 2>&1 && break; sleep 1; done
fi
if garage status | grep -q "NO ROLE ASSIGNED"; then
  echo "Menetapkan layout cluster (1 node)..."
  NODE=$(garage node id -q | cut -d@ -f1)
  garage layout assign -z dc1 -c 10G "$NODE" >/dev/null
  garage layout apply --version 1 >/dev/null
fi
if ! garage key info ${KEY_NAME} >/dev/null 2>&1; then
  echo "Membuat access key ${KEY_NAME}..."
  garage key create ${KEY_NAME} >/dev/null
fi
if ! garage bucket info ${BUCKET} >/dev/null 2>&1; then
  echo "Membuat bucket ${BUCKET}..."
  garage bucket create ${BUCKET} >/dev/null
fi
garage bucket allow --read --write --owner ${BUCKET} --key ${KEY_NAME} >/dev/null
garage key info ${KEY_NAME} --show-secret | grep -E "^(Key ID|Secret key):"
if [ -n "$STARTED" ]; then kill $STARTED; fi
`;

const run = spawnSync('wsl.exe', ['-d', DISTRO, '-u', 'root', '--', 'bash', '-s'], {
  input: SETUP_SCRIPT.replace(/\r\n/g, '\n'),
  encoding: 'utf8',
  windowsHide: true
});
const output = `${run.stdout || ''}${run.stderr || ''}`.replace(/\0/g, '');
const keyId = /Key ID:\s*(\S+)/.exec(output)?.[1];
const secret = /Secret key:\s*(\S+)/.exec(output)?.[1];
console.log(output.split('\n').filter(l => l && !/^(Key ID|Secret key):/.test(l)).join('\n'));
if (run.status !== 0 || !keyId || !secret) {
  console.error('❌ Setup Garage gagal. Pastikan WSL Ubuntu aktif & terhubung internet.');
  process.exit(1);
}

// Tulis / perbarui nilai S3_* di .env (baris lain tidak diubah)
const values = {
  S3_ENDPOINT: `http://127.0.0.1:${S3_PORT}`,
  S3_REGION: 'garage',
  S3_BUCKET: BUCKET,
  S3_ACCESS_KEY_ID: keyId,
  S3_SECRET_ACCESS_KEY: secret,
  S3_FORCE_PATH_STYLE: 'true'
};
let env = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
const eol = env.includes('\r\n') ? '\r\n' : '\n';
const missing = [];
for (const [key, value] of Object.entries(values)) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(env)) env = env.replace(pattern, line);
  else missing.push(line);
}
if (missing.length) {
  env = `${env.replace(/\s*$/, '')}${eol}${eol}# === OBJECT STORAGE (S3-compatible: foto verifikasi & file sementara) ===${eol}${missing.join(eol)}${eol}`;
}
fs.writeFileSync(ENV_PATH, env);
console.log(`✅ Garage siap: bucket "${BUCKET}" di http://127.0.0.1:${S3_PORT}, kredensial S3_* tersimpan di .env`);
