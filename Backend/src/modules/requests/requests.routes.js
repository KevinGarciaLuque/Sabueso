import { Router } from 'express';
import { z } from 'zod';
import * as repo from './requests.repository.js';
import { notificarTiendasCompatibles } from '../matching/matching.service.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { CLIENT_ROLES, STORE_ROLES, PLATFORM_ROLES } from '../../constants/roles.js';
import { logger } from '../../utils/logger.js';

const router = Router();

const solicitudSchema = z.object({
  vehiculoId:       z.number().int().positive().optional(),
  categoriaId:      z.number().int().positive().optional(),
  nombreRepuesto:   z.string().min(3).max(200).trim(),
  descripcion:      z.string().max(2000).optional(),
  lado:             z.enum(['IZQUIERDO','DERECHO','DELANTERO','TRASERO','CENTRAL','NO_APLICA']).optional(),
  posicion:         z.string().max(80).optional(),
  cantidad:         z.number().int().min(1).max(99).default(1),
  numeroPieza:      z.string().max(80).optional(),
  condicionAceptada:z.enum(['NUEVO','USADO','CUALQUIERA']).default('CUALQUIERA'),
  presupuestoMin:   z.number().positive().optional(),
  presupuestoMax:   z.number().positive().optional(),
  ciudad:           z.string().max(100).optional(),
  departamento:     z.string().max(100).optional(),
  latitud:          z.number().optional(),
  longitud:         z.number().optional(),
  metodoEntrega:    z.enum(['RETIRO','ENVIO_LOCAL','ENVIO_NACIONAL','CUALQUIERA']).default('CUALQUIERA'),
  urgencia:         z.enum(['BAJA','MEDIA','ALTA','CRITICA']).default('MEDIA'),
  fechaLimite:      z.string().datetime().optional(),
  esPrivada:        z.boolean().default(false),
});

// Listado público para tiendas
router.get('/publicas', authenticate, authorize(...STORE_ROLES, ...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await repo.findPublic({
      limit, offset,
      marcaId:     req.query.marcaId     ? Number(req.query.marcaId) : undefined,
      modeloId:    req.query.modeloId    ? Number(req.query.modeloId) : undefined,
      categoriaId: req.query.categoriaId ? Number(req.query.categoriaId) : undefined,
      ciudad:      req.query.ciudad,
      urgencia:    req.query.urgencia,
      busqueda:    req.query.q,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Admin: todas las solicitudes
router.get('/admin', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await repo.findPublic({
      limit, offset,
      busqueda: req.query.q,
      ciudad:   req.query.ciudad,
      urgencia: req.query.urgencia,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Mis solicitudes (cliente)
router.get('/mis', authenticate, async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await repo.findByUser(req.user.sub, {
      limit, offset, estado: req.query.estado,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Detalle
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const s = await repo.findById(Number(req.params.id));
    if (!s) return notFound(res);

    // Solo dueño, tiendas y admins ven la solicitud privada
    if (s.es_privada && s.usuario_id !== req.user.sub
        && !STORE_ROLES.includes(req.user.tipo)
        && !PLATFORM_ROLES.includes(req.user.tipo)) {
      return forbidden(res);
    }

    await repo.incrementVistas(s.id);
    const imagenes = await repo.getImages(s.id);
    ok(res, { ...s, imagenes });
  } catch (err) { next(err); }
});

// Crear solicitud
router.post('/', authenticate, authorize(...CLIENT_ROLES), async (req, res, next) => {
  try {
    const data = solicitudSchema.parse(req.body);
    const id = await repo.create(req.user.sub, data);
    created(res, { id }, 'Solicitud creada');
  } catch (err) { next(err); }
});

// Publicar solicitud (borrador → publicada)
router.patch('/:id/publicar', authenticate, authorize(...CLIENT_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const s = await repo.findById(id);
    if (!s) return notFound(res);
    if (s.usuario_id !== req.user.sub) return forbidden(res);
    if (s.estado !== 'BORRADOR') {
      return res.status(400).json({ ok: false, message: 'Solo puedes publicar borradores' });
    }
    await repo.updateEstado(id, req.user.sub, 'PUBLICADA', s.estado);

    // Fire-and-forget: notify compatible stores (non-blocking)
    notificarTiendasCompatibles(id)
      .then(n => logger.info({ solicitudId: id, notificadas: n }, 'Matching completado'))
      .catch(err => logger.warn({ err, solicitudId: id }, 'Error en motor de coincidencias'));

    ok(res, {}, 'Solicitud publicada');
  } catch (err) { next(err); }
});

// Cancelar solicitud
router.patch('/:id/cancelar', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const s = await repo.findById(id);
    if (!s) return notFound(res);

    const esAdmin = PLATFORM_ROLES.includes(req.user.tipo);
    if (!esAdmin && s.usuario_id !== req.user.sub) return forbidden(res);

    const terminales = ['COMPLETADA','CANCELADA','EXPIRADA'];
    if (terminales.includes(s.estado)) {
      return res.status(400).json({ ok: false, message: 'La solicitud ya está cerrada' });
    }
    await repo.updateEstado(id, req.user.sub, 'CANCELADA', s.estado, req.body.motivo);
    ok(res, {}, 'Solicitud cancelada');
  } catch (err) { next(err); }
});

export default router;
