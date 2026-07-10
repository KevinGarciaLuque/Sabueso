import { Router } from 'express';
import { z } from 'zod';
import * as repo from './calificaciones.repository.js';
import * as ordenRepo from '../ordenes/ordenes.repository.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden, badRequest, conflict } from '../../utils/response.js';
import { CLIENT_ROLES } from '../../constants/roles.js';

const router = Router();

const califSchema = z.object({
  ordenId:       z.number().int().positive(),
  calidad:       z.number().int().min(1).max(5),
  compatibilidad:z.number().int().min(1).max(5),
  precio:        z.number().int().min(1).max(5),
  atencion:      z.number().int().min(1).max(5),
  rapidez:       z.number().int().min(1).max(5),
  comentario:    z.string().max(1000).optional(),
});

// Cliente: calificar tienda
router.post('/', authenticate, authorize(...CLIENT_ROLES), async (req, res, next) => {
  try {
    const data = califSchema.parse(req.body);
    const orden = await ordenRepo.findById(data.ordenId);
    if (!orden) return notFound(res, 'Orden no encontrada');
    if (orden.cliente_id !== req.user.sub) return forbidden(res);
    if (orden.estado !== 'ENTREGADA') return badRequest(res, 'Solo puedes calificar órdenes entregadas');

    const existe = await repo.findByOrden(data.ordenId);
    if (existe) return conflict(res, 'Ya calificaste esta orden');

    const id = await repo.create({
      tenantId:      orden.tenant_id,
      ordenId:       data.ordenId,
      clienteId:     req.user.sub,
      calidad:       data.calidad,
      compatibilidad:data.compatibilidad,
      precio:        data.precio,
      atencion:      data.atencion,
      rapidez:       data.rapidez,
      comentario:    data.comentario,
    });

    created(res, { id }, 'Calificación registrada. ¡Gracias!');
  } catch (err) { next(err); }
});

// Pública: calificaciones de una tienda
router.get('/tienda/:tenantId', async (req, res, next) => {
  try {
    const { rows, total } = await repo.findByTenant(Number(req.params.tenantId));
    const promedio = await repo.promedioTenant(Number(req.params.tenantId));
    ok(res, { calificaciones: rows, total, promedio });
  } catch (err) { next(err); }
});

export default router;
