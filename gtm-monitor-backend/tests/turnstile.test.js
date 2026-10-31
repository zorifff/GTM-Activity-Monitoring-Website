// Uji captcha Cloudflare Turnstile pada login (middleware requireTurnstile + siteverify Cloudflare sungguhan).
// Memakai secret key UJI resmi Cloudflare (selalu lolos / selalu gagal / token sudah terpakai) dan token dummy,
// sehingga tidak bergantung pada widget di browser. Butuh koneksi internet ke challenges.cloudflare.com.
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backendDir, '.env'));
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`); };

const { requireTurnstile } = require(path.join(backendDir, 'src/middlewares/turnstile'));

// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const SECRET_ALWAYS_PASS = '1x0000000000000000000000000000000AA';
const SECRET_ALWAYS_FAIL = '2x0000000000000000000000000000000AA';
const SECRET_TOKEN_SPENT = '3x0000000000000000000000000000000AA';
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

// Jalankan middleware dengan request tiruan → { passed, status, code }
const run = (secret, body) => new Promise(resolve => {
  const req = { body, ip: '127.0.0.1', id: 'uji-turnstile' };
  requireTurnstile('login', { secret })(req, {}, (err) => {
    resolve(err ? { passed: false, status: err.statusCode, code: err.body?.code, message: err.body?.message } : { passed: true });
  });
});

(async () => {
  const disabled = await run('', { username: 'a', password: 'b' });
  check('Secret kosong → verifikasi dilewati (test suite / pengembangan)', disabled.passed);

  const missing = await run(SECRET_ALWAYS_PASS, { username: 'a', password: 'b' });
  check('Tanpa token captcha → 400 CAPTCHA_REQUIRED', !missing.passed && missing.status === 400 && missing.code === 'CAPTCHA_REQUIRED', missing.message);

  const ok = await run(SECRET_ALWAYS_PASS, { turnstileToken: DUMMY_TOKEN });
  check('Token sah (diverifikasi Cloudflare) → login dilanjutkan', ok.passed, ok.passed ? '' : `${ok.status} ${ok.code}`);

  const invalid = await run(SECRET_ALWAYS_FAIL, { turnstileToken: DUMMY_TOKEN });
  check('Token ditolak Cloudflare → 400 CAPTCHA_INVALID', !invalid.passed && invalid.status === 400 && invalid.code === 'CAPTCHA_INVALID', invalid.message);

  const spent = await run(SECRET_TOKEN_SPENT, { turnstileToken: DUMMY_TOKEN });
  check('Token sudah terpakai / kedaluwarsa → 400 dengan pesan ulangi captcha', !spent.passed && spent.status === 400 && /kedaluwarsa/.test(spent.message || ''), spent.message);

  const originalFetch = global.fetch;
  global.fetch = () => Promise.reject(new Error('jaringan putus (uji)'));
  const consoleError = console.error;
  console.error = () => {};
  const down = await run(SECRET_ALWAYS_PASS, { turnstileToken: DUMMY_TOKEN });
  console.error = consoleError;
  global.fetch = originalFetch;
  check('Cloudflare tidak terjangkau → 503 CAPTCHA_UNAVAILABLE (login ditolak, bukan dilewati)', !down.passed && down.status === 503 && down.code === 'CAPTCHA_UNAVAILABLE');

  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
