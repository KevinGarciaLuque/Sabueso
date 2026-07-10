import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fs from 'fs/promises';
import { authenticate, tenantScope } from '../../middlewares/auth.js';
import { upload } from '../../middlewares/upload.js';
import { ok, badRequest, serverError } from '../../utils/response.js';
import pool from '../../config/db.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../../uploads');

router.use(authenticate, tenantScope);

// POST /api/uploads/solicitud/:id  — upload images for a request
router.post('/solicitud/:id', upload.array('imagenes', 5), async (req, res) => {
  const solicitudId = Number(req.params.id);
  const files = req.files;

  if (!files?.length) return badRequest(res, 'No se recibieron imágenes');

  try {
    // Verify solicitud belongs to this user
    const [rows] = await pool.query(
      'SELECT id FROM solicitudes WHERE id = ? AND usuario_id = ?',
      [solicitudId, req.user.id]
    );
    if (!rows.length) return badRequest(res, 'Solicitud no encontrada');

    const saved = [];
    for (const file of files) {
      // Optimize with sharp
      const optimized = file.path.replace(/\.[^.]+$/, '_opt.webp');
      await sharp(file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(optimized);
      await fs.unlink(file.path);

      const url = `/uploads/${path.basename(optimized)}`;
      await pool.query(
        'INSERT INTO solicitud_imagenes (solicitud_id, url, orden) VALUES (?, ?, ?)',
        [solicitudId, url, saved.length]
      );
      saved.push({ url });
    }

    ok(res, saved, 'Imágenes subidas correctamente');
  } catch (err) {
    // Cleanup on error
    for (const f of files) {
      try { await fs.unlink(f.path); } catch {}
    }
    logger.error({ err }, 'Error al subir imágenes de solicitud');
    serverError(res);
  }
});

// POST /api/uploads/oferta/:id  — upload images for an offer
router.post('/oferta/:id', upload.array('imagenes', 5), async (req, res) => {
  const ofertaId = Number(req.params.id);
  const files = req.files;

  if (!files?.length) return badRequest(res, 'No se recibieron imágenes');

  try {
    const [rows] = await pool.query(
      'SELECT id FROM ofertas WHERE id = ? AND tenant_id = ?',
      [ofertaId, req.user.tenantId]
    );
    if (!rows.length) return badRequest(res, 'Oferta no encontrada');

    const saved = [];
    for (const file of files) {
      const optimized = file.path.replace(/\.[^.]+$/, '_opt.webp');
      await sharp(file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(optimized);
      await fs.unlink(file.path);

      const url = `/uploads/${path.basename(optimized)}`;
      await pool.query(
        'INSERT INTO oferta_imagenes (oferta_id, url, orden) VALUES (?, ?, ?)',
        [ofertaId, url, saved.length]
      );
      saved.push({ url });
    }

    ok(res, saved, 'Imágenes subidas correctamente');
  } catch (err) {
    for (const f of files) {
      try { await fs.unlink(f.path); } catch {}
    }
    logger.error({ err }, 'Error al subir imágenes de oferta');
    serverError(res);
  }
});

export default router;
