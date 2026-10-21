// Membungkus controller async: error apa pun diteruskan ke error handler terpusat (middlewares/errorHandler.js).
// `publicMessage` = pesan umum yang aman ditampilkan ke klien bila terjadi error internal (500) di endpoint ini.
const AppError = require('./AppError');

const asyncHandler = (handler, publicMessage) => (req, res, next) => {
  Promise.resolve()
    .then(() => handler(req, res, next))
    .catch((err) => {
      // AppError sudah membawa pesan untuk klien; publicMessage hanya untuk error internal
      if (publicMessage && err && typeof err === 'object' && !(err instanceof AppError) && !err.publicMessage) {
        err.publicMessage = publicMessage;
      }
      next(err);
    });
};

module.exports = asyncHandler;
