import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../utils/response.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return unauthorized(res);

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    next();
  } catch {
    return unauthorized(res, 'Token inválido o expirado');
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.tipo)) return forbidden(res);
    next();
  };
}

export function requireTenant(req, res, next) {
  if (!req.user?.tenantId) return forbidden(res, 'Acceso solo para tiendas');
  next();
}

export function tenantScope(req, res, next) {
  // Inyecta tenantId desde el token, nunca del body
  req.tenantId = req.user?.tenantId || null;
  next();
}
