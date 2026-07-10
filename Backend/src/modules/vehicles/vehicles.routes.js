import { Router } from 'express';
import { z } from 'zod';
import * as repo from './vehicles.repository.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden } from '../../utils/response.js';
import { CLIENT_ROLES } from '../../constants/roles.js';

const router = Router();
router.use(authenticate);

const vehiculoSchema = z.object({
  marcaId:      z.number().int().positive().optional(),
  modeloId:     z.number().int().positive().optional(),
  versionId:    z.number().int().positive().optional(),
  anio:         z.number().int().min(1950).max(new Date().getFullYear() + 1),
  motor:        z.string().max(20).optional(),
  combustible:  z.enum(['GASOLINA','DIESEL','HIBRIDO','ELECTRICO','GAS','OTRO']).optional(),
  transmision:  z.enum(['MANUAL','AUTOMATICA','CVT','OTRO']).optional(),
  traccion:     z.enum(['4X2','4X4','AWD','FWD','RWD']).optional(),
  color:        z.string().max(40).optional(),
  vin:          z.string().max(20).optional(),
  placa:        z.string().max(20).optional(),
  observaciones:z.string().max(500).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const vehiculos = await repo.findByUser(req.user.sub);
    ok(res, vehiculos);
  } catch (err) { next(err); }
});

router.post('/', authorize(...CLIENT_ROLES), async (req, res, next) => {
  try {
    const data = vehiculoSchema.parse(req.body);
    const id = await repo.create(req.user.sub, data);
    created(res, { id }, 'Vehículo registrado');
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const v = await repo.findOne(Number(req.params.id), req.user.sub);
    if (!v) return notFound(res, 'Vehículo no encontrado');
    ok(res, v);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const v = await repo.findOne(id, req.user.sub);
    if (!v) return notFound(res, 'Vehículo no encontrado');

    const data = vehiculoSchema.partial().parse(req.body);
    const dbFields = {};
    const map = { marcaId:'marca_id', modeloId:'modelo_id', versionId:'version_id' };
    for (const [k, val] of Object.entries(data)) {
      dbFields[map[k] || k.replace(/([A-Z])/g, '_$1').toLowerCase()] = val;
    }
    await repo.update(id, req.user.sub, dbFields);
    ok(res, {}, 'Vehículo actualizado');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const v = await repo.findOne(id, req.user.sub);
    if (!v) return notFound(res, 'Vehículo no encontrado');
    await repo.softDelete(id, req.user.sub);
    ok(res, {}, 'Vehículo eliminado');
  } catch (err) { next(err); }
});

export default router;
