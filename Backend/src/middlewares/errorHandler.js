import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.url, method: req.method }, 'Error no manejado');

  if (err.name === 'ZodError') {
    return res.status(400).json({
      ok: false,
      message: 'Datos inválidos',
      errors: err.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message })),
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, message: 'El registro ya existe.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    ok: false,
    message: status === 500 ? 'Error interno del servidor' : err.message,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, message: `Ruta ${req.method} ${req.url} no encontrada` });
}
