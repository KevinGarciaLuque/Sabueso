export const ok = (res, data = {}, message = 'OK', statusCode = 200) =>
  res.status(statusCode).json({ ok: true, message, data });

export const created = (res, data = {}, message = 'Creado exitosamente') =>
  ok(res, data, message, 201);

export const noContent = (res) => res.status(204).send();

export const badRequest = (res, message = 'Solicitud inválida', errors = null) =>
  res.status(400).json({ ok: false, message, ...(errors && { errors }) });

export const unauthorized = (res, message = 'No autorizado') =>
  res.status(401).json({ ok: false, message });

export const forbidden = (res, message = 'Acceso denegado') =>
  res.status(403).json({ ok: false, message });

export const notFound = (res, message = 'Recurso no encontrado') =>
  res.status(404).json({ ok: false, message });

export const conflict = (res, message = 'Conflicto con recurso existente') =>
  res.status(409).json({ ok: false, message });

export const serverError = (res, message = 'Error interno del servidor') =>
  res.status(500).json({ ok: false, message });
