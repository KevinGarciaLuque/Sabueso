import { Router } from 'express';
import { z } from 'zod';
import * as repo from './offers.repository.js';
import * as reqRepo from '../requests/requests.repository.js';
import * as ordenRepo from '../ordenes/ordenes.repository.js';
import { authenticate, authorize, requireTenant, tenantScope } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden, badRequest } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { STORE_ROLES, CLIENT_ROLES } from '../../constants/roles.js';

const router = Router();

const ofertaSchema = z.object({
  solicitudId:          z.number().int().positive(),
  sucursalId:           z.number().int().positive().optional(),
  precio:               z.number().positive(),
  costoEnvio:           z.number().min(0).default(0),
  tipoRepuesto:         z.enum(['ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO','RECONSTRUIDO','ALTERNATIVO','DESARMADERO']),
  condicion:            z.enum(['NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES','PARA_RECONSTRUCCION']),
  marcaFabricante:      z.string().max(100).optional(),
  numeroOem:            z.string().max(80).optional(),
  numeroAlterno:        z.string().max(80).optional(),
  garantiaDias:         z.number().int().min(0).default(0),
  disponibilidad:       z.enum(['INMEDIATA','1_DIA','2_3_DIAS','1_SEMANA','A_PEDIDO']).default('INMEDIATA'),
  metodoEntrega:        z.enum(['RETIRO','ENVIO_LOCAL','ENVIO_NACIONAL','MOTORISTA']).default('RETIRO'),
  metodosPago:          z.array(z.string()).optional(),
  compatibilidad:       z.enum(['CONFIRMADA_VIN','CONFIRMADA_OEM','POR_REVISAR','REQUIERE_COMPARACION']).default('POR_REVISAR'),
  incluyeAccesorios:    z.boolean().default(false),
  requierePiezaVieja:   z.boolean().default(false),
  requiereAdaptacion:   z.boolean().default(false),
  observaciones:        z.string().max(1000).optional(),
  venceEn:              z.string().datetime().optional(),
});

// Tienda: mis ofertas enviadas
router.get('/mis', authenticate, requireTenant, tenantScope, async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await repo.findByTenant(req.tenantId, {
      limit, offset, estado: req.query.estado,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Ver ofertas de una solicitud (cliente dueño de la solicitud)
router.get('/solicitud/:solicitudId', authenticate, async (req, res, next) => {
  try {
    const solicitudId = Number(req.params.solicitudId);
    const s = await reqRepo.findById(solicitudId);
    if (!s) return notFound(res, 'Solicitud no encontrada');

    // Solo el cliente dueño puede ver sus ofertas, o la propia tienda
    const esDueno = s.usuario_id === req.user.sub;
    const esTienda = STORE_ROLES.includes(req.user.tipo);
    if (!esDueno && !esTienda) return forbidden(res);

    const ofertas = await repo.findBySolicitud(solicitudId);
    const scores  = await repo.scoreOfertas(solicitudId);
    const scoreMap = Object.fromEntries(scores.map(s => [s.id, s]));

    const enriquecidas = ofertas.map(o => ({
      ...o,
      score: scoreMap[o.id] || null,
    }));

    ok(res, enriquecidas);
  } catch (err) { next(err); }
});

// Detalle de oferta
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const o = await repo.findById(Number(req.params.id));
    if (!o) return notFound(res);
    const imagenes = await repo.getImages(o.id);
    ok(res, { ...o, imagenes });
  } catch (err) { next(err); }
});

// Tienda: enviar oferta
router.post('/', authenticate, requireTenant, tenantScope, authorize(...STORE_ROLES), async (req, res, next) => {
  try {
    const data = ofertaSchema.parse(req.body);

    const s = await reqRepo.findById(data.solicitudId);
    if (!s) return notFound(res, 'Solicitud no encontrada');
    if (!['PUBLICADA','RECIBIENDO_OFERTAS'].includes(s.estado)) {
      return badRequest(res, 'La solicitud no está recibiendo ofertas');
    }

    const id = await repo.create(req.tenantId, { ...data, vendedorId: req.user.sub });
    await reqRepo.incrementOfertas(data.solicitudId);

    created(res, { id }, 'Oferta enviada exitosamente');
  } catch (err) { next(err); }
});

// Cliente: seleccionar oferta
router.patch('/:id/seleccionar', authenticate, authorize(...CLIENT_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const oferta = await repo.findById(id);
    if (!oferta) return notFound(res);

    const s = await reqRepo.findById(oferta.solicitud_id);
    if (!s) return notFound(res, 'Solicitud no encontrada');
    if (s.usuario_id !== req.user.sub) return forbidden(res);

    await repo.updateEstado(id, 'ACEPTADA');
    await reqRepo.updateEstado(oferta.solicitud_id, req.user.sub, 'OFERTA_SELECCIONADA', s.estado);

    // Crear orden automáticamente
    const numero = await ordenRepo.generateNumero();
    const ordenId = await ordenRepo.create({
      tenantId:      oferta.tenant_id,
      solicitudId:   oferta.solicitud_id,
      ofertaId:      oferta.id,
      clienteId:     req.user.sub,
      numero,
      subtotal:      Number(oferta.precio),
      costoEnvio:    Number(oferta.costo_envio ?? 0),
      total:         Number(oferta.precio) + Number(oferta.costo_envio ?? 0),
      metodoEntrega: oferta.metodo_entrega,
    });

    ok(res, { ordenId }, 'Oferta seleccionada');
  } catch (err) { next(err); }
});

// Tienda: retirar oferta
router.patch('/:id/retirar', authenticate, requireTenant, tenantScope, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const oferta = await repo.findById(id);
    if (!oferta) return notFound(res);
    if (oferta.tenant_id !== req.tenantId) return forbidden(res);
    if (['ACEPTADA','VENCIDA'].includes(oferta.estado)) {
      return badRequest(res, 'No puedes retirar esta oferta');
    }
    await repo.updateEstado(id, 'RETIRADA');
    ok(res, {}, 'Oferta retirada');
  } catch (err) { next(err); }
});

export default router;
