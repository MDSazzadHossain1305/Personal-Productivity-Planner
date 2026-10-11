export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
 
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join(', ') });
  }
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
}
