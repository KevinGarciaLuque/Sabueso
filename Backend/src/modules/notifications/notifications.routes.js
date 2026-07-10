import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import * as repo from './notifications.repository.js';
import { ok } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const soloNoLeidas = req.query.noLeidas === 'true';
    const { rows, total } = await repo.findByUser(req.user.sub, { limit, offset, soloNoLeidas });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

router.get('/sin-leer', async (req, res, next) => {
  try {
    const total = await repo.countUnread(req.user.sub);
    ok(res, { total });
  } catch (err) { next(err); }
});

router.patch('/:id/leer', async (req, res, next) => {
  try {
    await repo.markAsRead(Number(req.params.id), req.user.sub);
    ok(res, {}, 'Notificación marcada como leída');
  } catch (err) { next(err); }
});

router.patch('/leer-todas', async (req, res, next) => {
  try {
    await repo.markAllAsRead(req.user.sub);
    ok(res, {}, 'Todas marcadas como leídas');
  } catch (err) { next(err); }
});

export default router;
