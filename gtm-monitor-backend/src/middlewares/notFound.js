// Dedicated API 404 handler: ensure API requests never fall back to HTML index.html
const notFound = (req, res) => {
  res.status(404).json({ error: `Endpoint API "${req.originalUrl}" tidak ditemukan pada server.` });
};

module.exports = notFound;
