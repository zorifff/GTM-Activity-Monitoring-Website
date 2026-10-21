// ID unik per request: dikirim ke klien (header X-Request-Id & respons error) dan dicatat di log server,
// sehingga laporan error dari pengguna bisa dicocokkan dengan detail lengkap di log.
const crypto = require('crypto');

const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

module.exports = requestId;
