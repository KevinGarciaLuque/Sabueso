import { Router } from 'express';
import { z } from 'zod';
import * as repo from './chat.repository.js';
import { authenticate, requireTenant, tenantScope } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden } from '../../utils/response.js';
import { parsePagination } from '../../utils/pagination.js';
import { STORE_ROLES, CLIENT_ROLES } from '../../constants/roles.js';

const router = Router();
router.use(authenticate);

// Total de mensajes sin leer (badge del sidebar)
router.get('/unread', async (req, res, next) => {
  try {
    const esCliente = CLIENT_ROLES.includes(req.user.tipo);
    const total = await repo.getUnreadTotal({
      usuarioId: req.user.sub,
      tenantId:  req.user.tenantId,
      esCliente,
    });
    ok(res, { total });
  } catch (err) { next(err); }
});

// Iniciar o recuperar conversación
router.post('/conversaciones', async (req, res, next) => {
  try {
    const { solicitudId, ofertaId, tenantId } = z.object({
      solicitudId: z.number().int().positive(),
      ofertaId:    z.number().int().positive().optional(),
      tenantId:    z.number().int().positive(),
    }).parse(req.body);

    const conv = await repo.findOrCreateConversacion({
      solicitudId, ofertaId, tenantId, clienteId: req.user.sub,
    });
    created(res, conv, 'Conversación lista');
  } catch (err) { next(err); }
});

// Mis conversaciones (cliente)
router.get('/conversaciones/mis', async (req, res, next) => {
  try {
    const convs = await repo.findConversacionesByUser(req.user.sub);
    ok(res, convs);
  } catch (err) { next(err); }
});

// Conversaciones de la tienda
router.get('/conversaciones/tienda', requireTenant, tenantScope, async (req, res, next) => {
  try {
    const convs = await repo.findConversacionesByTenant(req.tenantId);
    ok(res, convs);
  } catch (err) { next(err); }
});

// Mensajes de una conversación
router.get('/conversaciones/:id/mensajes', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const conv = await repo.findConversacionById(id);
    if (!conv) return notFound(res);

    const esTienda = STORE_ROLES.includes(req.user.tipo);
    const esCliente = conv.cliente_id === req.user.sub;
    const esDeTienda = esTienda && conv.tenant_id === req.user.tenantId;
    if (!esCliente && !esDeTienda) return forbidden(res);

    const { limit, offset } = parsePagination(req.query);
    const mensajes = await repo.getMensajes(id, { limit, offset });
    await repo.marcarLeidos(id, esCliente);

    ok(res, mensajes);
  } catch (err) { next(err); }
});

export default router;
