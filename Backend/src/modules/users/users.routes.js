import { Router } from 'express';
import { z } from 'zod';
import db from '../../config/db.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, notFound, badRequest } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { ROLES, PLATFORM_ROLES } from '../../constants/roles.js';
import { audit } from '../../utils/audit.js';

const router = Router();
router.use(authenticate, authorize(...PLATFORM_ROLES));

// Listar todos los usuarios
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const conds  = [];
    const params = [];

    if (req.query.q) {
      conds.push('(u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?)');
      const like = `%${req.query.q}%`;
      params.push(like, like, like);
    }
    if (req.query.tipo) { conds.push('u.tipo = ?'); params.push(req.query.tipo); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.tipo, u.activo,
              u.email_verificado, u.creado_en, u.ultimo_acceso,
              t.nombre_comercial AS tenant_nombre
       FROM usuarios u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       ${where}
       ORDER BY u.creado_en DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM usuarios u ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Activar / desactivar usuario
router.patch('/:id/activo', async (req, res, next) => {
  try {
    const uid = Number(req.params.id);
    if (uid === req.user.sub) return badRequest(res, 'No puedes desactivarte a ti mismo');

    const [[u]] = await db.query('SELECT id, tipo FROM usuarios WHERE id = ? LIMIT 1', [uid]);
    if (!u) return notFound(res, 'Usuario no encontrado');
    if (u.tipo === ROLES.SUPER_ADMIN) return badRequest(res, 'No se puede desactivar un Super Admin');

    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
    await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, uid]);
    audit(req, activo ? 'USUARIO_ACTIVADO' : 'USUARIO_DESACTIVADO', 'usuarios', uid, { activo });
    ok(res, {}, activo ? 'Usuario activado' : 'Usuario desactivado');
  } catch (err) { next(err); }
});

// Cambiar tipo / rol de usuario
router.patch('/:id/tipo', authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const uid = Number(req.params.id);
    if (uid === req.user.sub) return badRequest(res, 'No puedes cambiar tu propio rol');

    const [[u]] = await db.query('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [uid]);
    if (!u) return notFound(res, 'Usuario no encontrado');

    const { tipo } = z.object({
      tipo: z.enum(['SUPER_ADMIN','ADMIN_SOPORTE','ADMIN_COMERCIAL','MODERADOR',
                    'CLIENTE','MECANICO','TALLER','EMPRESA']),
    }).parse(req.body);

    await db.query('UPDATE usuarios SET tipo = ? WHERE id = ?', [tipo, uid]);
    audit(req, 'USUARIO_TIPO_CAMBIADO', 'usuarios', uid, { tipo });
    ok(res, {}, 'Tipo actualizado');
  } catch (err) { next(err); }
});

export default router;

