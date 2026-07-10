import { Router } from 'express';
import { z } from 'zod';
import db from '../../config/db.js';
import { ok, created, notFound } from '../../utils/response.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ROLES, PLATFORM_ROLES } from '../../constants/roles.js';
import { audit } from '../../utils/audit.js';

const router = Router();

// ── Público: lectura ──────────────────────────────────────────

router.get('/marcas', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, nombre, pais FROM marcas WHERE activa = 1 ORDER BY nombre');
    ok(res, rows);
  } catch (err) { next(err); }
});

router.get('/marcas/:id/modelos', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, tipo FROM modelos WHERE marca_id = ? AND activo = 1 ORDER BY nombre',
      [req.params.id]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

router.get('/modelos/:id/versiones', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, anio_inicio, anio_fin FROM versiones WHERE modelo_id = ? ORDER BY anio_inicio DESC',
      [req.params.id]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

router.get('/categorias', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.nombre, c.slug, c.padre_id, c.icono,
              COUNT(s.id) AS total_solicitudes
       FROM categorias_repuestos c
       LEFT JOIN solicitudes s ON s.categoria_id = c.id AND s.estado NOT IN ('CANCELADA','EXPIRADA')
       WHERE c.activa = 1
       GROUP BY c.id
       ORDER BY c.padre_id IS NOT NULL, c.nombre`,
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

router.get('/planes', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM planes WHERE activo = 1 ORDER BY orden');
    ok(res, rows);
  } catch (err) { next(err); }
});

// ── Admin: gestión de catálogo ────────────────────────────────

// Todas las marcas (admin, incluye inactivas)
router.get('/admin/marcas', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT m.id, m.nombre, m.pais, m.activa,
              COUNT(mo.id) AS total_modelos
       FROM marcas m LEFT JOIN modelos mo ON mo.marca_id = m.id
       GROUP BY m.id ORDER BY m.nombre`
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

const marcaSchema = z.object({
  nombre: z.string().min(1).max(80).trim(),
  pais:   z.string().max(60).optional().nullable(),
  activa: z.boolean().optional(),
});

router.post('/admin/marcas', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const d = marcaSchema.parse(req.body);
    const [r] = await db.query(
      'INSERT INTO marcas (nombre, pais) VALUES (?, ?)',
      [d.nombre, d.pais ?? null]
    );
    audit(req, 'MARCA_CREADA', 'marcas', r.insertId, d);
    const [[row]] = await db.query('SELECT * FROM marcas WHERE id = ?', [r.insertId]);
    created(res, row, 'Marca creada');
  } catch (err) { next(err); }
});

router.patch('/admin/marcas/:id', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = marcaSchema.partial().parse(req.body);
    const sets = []; const vals = [];
    if (d.nombre !== undefined) { sets.push('nombre = ?'); vals.push(d.nombre); }
    if (d.pais   !== undefined) { sets.push('pais = ?');   vals.push(d.pais); }
    if (d.activa !== undefined) { sets.push('activa = ?'); vals.push(d.activa ? 1 : 0); }
    if (!sets.length) return ok(res, {});
    vals.push(id);
    await db.query(`UPDATE marcas SET ${sets.join(', ')} WHERE id = ?`, vals);
    audit(req, 'MARCA_ACTUALIZADA', 'marcas', id, d);
    ok(res, {}, 'Marca actualizada');
  } catch (err) { next(err); }
});

// Todos los modelos de una marca (admin)
router.get('/admin/marcas/:id/modelos', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, tipo, activo FROM modelos WHERE marca_id = ? ORDER BY nombre',
      [Number(req.params.id)]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

const modeloSchema = z.object({
  marcaId: z.number().int().positive(),
  nombre:  z.string().min(1).max(80).trim(),
  tipo:    z.enum(['SEDAN','HATCHBACK','SUV','PICKUP','VAN','CAMION','MOTO','OTRO']).optional(),
  activo:  z.boolean().optional(),
});

router.post('/admin/modelos', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const d = modeloSchema.parse(req.body);
    const [r] = await db.query(
      'INSERT INTO modelos (marca_id, nombre, tipo) VALUES (?, ?, ?)',
      [d.marcaId, d.nombre, d.tipo ?? 'SEDAN']
    );
    audit(req, 'MODELO_CREADO', 'modelos', r.insertId, d);
    const [[row]] = await db.query('SELECT * FROM modelos WHERE id = ?', [r.insertId]);
    created(res, row, 'Modelo creado');
  } catch (err) { next(err); }
});

router.patch('/admin/modelos/:id', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = modeloSchema.partial().parse(req.body);
    const sets = []; const vals = [];
    if (d.nombre !== undefined) { sets.push('nombre = ?'); vals.push(d.nombre); }
    if (d.tipo   !== undefined) { sets.push('tipo = ?');   vals.push(d.tipo); }
    if (d.activo !== undefined) { sets.push('activo = ?'); vals.push(d.activo ? 1 : 0); }
    if (!sets.length) return ok(res, {});
    vals.push(id);
    await db.query(`UPDATE modelos SET ${sets.join(', ')} WHERE id = ?`, vals);
    audit(req, 'MODELO_ACTUALIZADO', 'modelos', id, d);
    ok(res, {}, 'Modelo actualizado');
  } catch (err) { next(err); }
});

// Categorías admin (todas, incluye inactivas)
router.get('/admin/categorias', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.nombre, c.slug, c.padre_id, c.icono, c.activa,
              p.nombre AS padre_nombre,
              COUNT(s.id) AS total_solicitudes
       FROM categorias_repuestos c
       LEFT JOIN categorias_repuestos p ON p.id = c.padre_id
       LEFT JOIN solicitudes s ON s.categoria_id = c.id
       GROUP BY c.id ORDER BY c.padre_id IS NOT NULL, c.nombre`
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

const categoriaSchema = z.object({
  nombre:  z.string().min(1).max(100).trim(),
  slug:    z.string().min(1).max(100).toLowerCase().trim(),
  padreId: z.number().int().positive().optional().nullable(),
  icono:   z.string().max(100).optional().nullable(),
  activa:  z.boolean().optional(),
});

router.post('/admin/categorias', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const d = categoriaSchema.parse(req.body);
    const [r] = await db.query(
      'INSERT INTO categorias_repuestos (nombre, slug, padre_id, icono) VALUES (?, ?, ?, ?)',
      [d.nombre, d.slug, d.padreId ?? null, d.icono ?? null]
    );
    audit(req, 'CATEGORIA_CREADA', 'categorias_repuestos', r.insertId, d);
    const [[row]] = await db.query('SELECT * FROM categorias_repuestos WHERE id = ?', [r.insertId]);
    created(res, row, 'Categoría creada');
  } catch (err) { next(err); }
});

router.patch('/admin/categorias/:id', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = categoriaSchema.partial().parse(req.body);
    const sets = []; const vals = [];
    if (d.nombre  !== undefined) { sets.push('nombre = ?');   vals.push(d.nombre); }
    if (d.slug    !== undefined) { sets.push('slug = ?');     vals.push(d.slug); }
    if (d.padreId !== undefined) { sets.push('padre_id = ?'); vals.push(d.padreId); }
    if (d.icono   !== undefined) { sets.push('icono = ?');    vals.push(d.icono); }
    if (d.activa  !== undefined) { sets.push('activa = ?');   vals.push(d.activa ? 1 : 0); }
    if (!sets.length) return ok(res, {});
    vals.push(id);
    await db.query(`UPDATE categorias_repuestos SET ${sets.join(', ')} WHERE id = ?`, vals);
    audit(req, 'CATEGORIA_ACTUALIZADA', 'categorias_repuestos', id, d);
    ok(res, {}, 'Categoría actualizada');
  } catch (err) { next(err); }
});

export default router;

