// Menerapkan skema Zod (src/validation/schemas.js) pada req.body / req.query sebelum masuk ke controller.

const formatIssues = (issues, source) => issues.map(issue => ({
  field: [source, ...issue.path].join('.'),
  message: issue.message
}));

// Validasi satu request; mengembalikan true bila lolos. Data hasil parsing (sudah dipangkas &
// tanpa field asing) menggantikan req.body / req.query.
function validateRequest(req, res, schema) {
  const errors = [];
  const parsed = {};

  for (const source of ['body', 'query']) {
    if (!schema[source]) continue;
    const input = req[source] && typeof req[source] === 'object' ? req[source] : {};
    const result = schema[source].safeParse(input);
    if (result.success) parsed[source] = result.data;
    else errors.push(...formatIssues(result.error.issues, source));
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: errors[0].message,
      error: errors[0].message,
      errors
    });
    return false;
  }

  if (parsed.body) req.body = parsed.body;
  // Express 5: req.query adalah getter read-only, jadi diganti lewat defineProperty
  if (parsed.query) Object.defineProperty(req, 'query', { value: parsed.query, writable: true, configurable: true });
  return true;
}

// Middleware Express: validate(schemas.login)
const validate = (schema) => (req, res, next) => {
  if (validateRequest(req, res, schema)) next();
};

module.exports = { validate, validateRequest };
