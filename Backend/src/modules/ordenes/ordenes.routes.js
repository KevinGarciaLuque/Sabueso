import { Router } from 'express';
import * as repo from './ordenes.repository.js';
import { authenticate, authorize, requireTenant, tenantScope } from '../../middlewares/auth.js';
import { ok, notFound, forbidden, badRequest } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { STORE_ROLES, CLIENT_ROLES } from '../../constants/roles.js';

const router = Router();

const STORE_TRANSITIONS = {
  PENDIENTE_CONFIRMACION: 'CONFIRMADA',
  CONFIRMADA:             'PREPARANDO',
  PREPARANDO:             'ENTREGADA',   // or LISTA_PARA_RETIRO but simplified
};

// Cliente: mis órdenes
router.get('/mis', authenticate, authorize(...CLIENT_ROLES), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await repo.findByCliente(req.user.sub, {
      limit, offset, estado: req.query.estado,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Tienda: órdenes recibidas
router.get('/tienda', authenticate, requireTenant, tenantScope, authorize(...STORE_ROLES), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await repo.findByTenant(req.tenantId, {
      limit, offset, estado: req.query.estado,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Detalle de orden
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const orden = await repo.findById(Number(req.params.id));
    if (!orden) return notFound(res, 'Orden no encontrada');

    const esDueno  = orden.cliente_id === req.user.sub;
    const esTienda = STORE_ROLES.includes(req.user.tipo) && orden.tenant_id === req.user.tenantId;
    if (!esDueno && !esTienda) return forbidden(res);

    ok(res, orden);
  } catch (err) { next(err); }
});

// Tienda: avanzar estado (confirmar → preparando → entregada)
router.patch('/:id/avanzar', authenticate, requireTenant, tenantScope, authorize(...STORE_ROLES), async (req, res, next) => {
  try {
    const orden = await repo.findById(Number(req.params.id));
    if (!orden) return notFound(res, 'Orden no encontrada');
    if (orden.tenant_id !== req.tenantId) return forbidden(res);

    const siguiente = STORE_TRANSITIONS[orden.estado];
    if (!siguiente) return badRequest(res, `No se puede avanzar desde el estado ${orden.estado}`);

    await repo.updateEstado(orden.id, siguiente);
    ok(res, { estado: siguiente }, `Orden actualizada a ${siguiente}`);
  } catch (err) { next(err); }
});

// Cancelar (cliente o tienda)
router.patch('/:id/cancelar', authenticate, async (req, res, next) => {
  try {
    const orden = await repo.findById(Number(req.params.id));
    if (!orden) return notFound(res, 'Orden no encontrada');

    const esDueno  = orden.cliente_id === req.user.sub;
    const esTienda = STORE_ROLES.includes(req.user.tipo) && orden.tenant_id === req.user.tenantId;
    if (!esDueno && !esTienda) return forbidden(res);

    if (['ENTREGADA','CANCELADA','REEMBOLSADA'].includes(orden.estado)) {
      return badRequest(res, 'No se puede cancelar esta orden');
    }

    await repo.updateEstado(orden.id, 'CANCELADA');
    ok(res, {}, 'Orden cancelada');
  } catch (err) { next(err); }
});

export default router;
