import { Router } from 'express';
import { z } from 'zod';
import db from '../../config/db.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden, badRequest } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { ROLES, PLATFORM_ROLES, CLIENT_ROLES } from '../../constants/roles.js';
import { audit } from '../../utils/audit.js';

const router = Router();
router.use(authenticate);

// Ensure tables exist
db.query(`
  CREATE TABLE IF NOT EXISTS garantias (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    orden_id INT UNSIGNED NOT NULL,
    cliente_id INT UNSIGNED NOT NULL,
    fecha_compra DATE NOT NULL,
    duracion_dias SMALLINT NOT NULL DEFAULT 0,
    fecha_vence DATE,
    condiciones TEXT,
    numero_serie VARCHAR(80),
    estado ENUM('ACTIVA','VENCIDA','RECLAMADA','ANULADA') NOT NULL DEFAULT 'ACTIVA',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (orden_id)  REFERENCES ordenes(id),
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
    INDEX idx_tenant (tenant_id), INDEX idx_orden (orden_id)
  )
`).catch(() => {});

db.query(`
  CREATE TABLE IF NOT EXISTS disputas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    orden_id INT UNSIGNED NOT NULL,
    cliente_id INT UNSIGNED NOT NULL,
    garantia_id INT UNSIGNED,
    motivo ENUM('REPUESTO_INCOMPATIBLE','PRODUCTO_DIFERENTE','PRODUCTO_DANADO',
                'NO_RECIBIDO','GARANTIA_NO_RESPETADA','PRECIO_DIFERENTE','PIEZA_INCOMPLETA','OTRO')
           NOT NULL DEFAULT 'OTRO',
    descripcion TEXT NOT NULL,
    evidencias_urls JSON,
    estado ENUM('ABIERTA','ESPERANDO_TIENDA','ESPERANDO_CLIENTE',
                'EN_REVISION','RESUELTA_CLIENTE','RESUELTA_TIENDA','CERRADA')
           NOT NULL DEFAULT 'ABIERTA',
    resolucion TEXT,
    resuelto_por INT UNSIGNED,
    resuelto_en DATETIME,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (orden_id)  REFERENCES ordenes(id),
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
    INDEX idx_tenant (tenant_id), INDEX idx_cliente (cliente_id), INDEX idx_estado (estado)
  )
`).catch(() => {});

// ── Garantías ─────────────────────────────────────────────────

// Crear garantía (tienda, al completar una orden)
router.post('/garantias', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.VENDEDOR), async (req, res, next) => {
  try {
    const d = z.object({
      ordenId:     z.number().int().positive(),
      fechaCompra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      duracionDias:z.number().int().min(0),
      condiciones: z.string().max(1000).optional().nullable(),
      numeroSerie: z.string().max(80).optional().nullable(),
    }).parse(req.body);

    // Verify order belongs to this tenant
    const [[orden]] = await db.query(
      'SELECT id, cliente_id FROM ordenes WHERE id = ? AND tenant_id = ? LIMIT 1',
      [d.ordenId, req.user.tenantId]
    );
    if (!orden) return notFound(res, 'Orden no encontrada');

    const fechaVence = new Date(d.fechaCompra);
    fechaVence.setDate(fechaVence.getDate() + d.duracionDias);

    const [r] = await db.query(
      `INSERT INTO garantias (tenant_id, orden_id, cliente_id, fecha_compra,
                              duracion_dias, fecha_vence, condiciones, numero_serie)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, d.ordenId, orden.cliente_id, d.fechaCompra,
       d.duracionDias, d.duracionDias > 0 ? fechaVence.toISOString().slice(0,10) : null,
       d.condiciones ?? null, d.numeroSerie ?? null]
    );
    const [[gar]] = await db.query('SELECT * FROM garantias WHERE id = ?', [r.insertId]);
    audit(req, 'GARANTIA_CREADA', 'garantias', r.insertId, d);
    created(res, gar, 'Garantía registrada');
  } catch (err) { next(err); }
});

// Mis garantías (cliente)
router.get('/garantias/mis', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT g.*, t.nombre_comercial AS tienda_nombre,
              o.numero AS orden_numero
       FROM garantias g
       JOIN tenants t ON t.id = g.tenant_id
       JOIN ordenes o ON o.id = g.orden_id
       WHERE g.cliente_id = ?
       ORDER BY g.creado_en DESC`,
      [req.user.sub]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

// Garantías de la tienda
router.get('/garantias/tienda', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.VENDEDOR), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const [rows] = await db.query(
      `SELECT g.*, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
              o.numero AS orden_numero
       FROM garantias g
       JOIN usuarios u ON u.id = g.cliente_id
       JOIN ordenes o ON o.id = g.orden_id
       WHERE g.tenant_id = ?
       ORDER BY g.creado_en DESC LIMIT ? OFFSET ?`,
      [req.user.tenantId, limit, offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM garantias WHERE tenant_id = ?', [req.user.tenantId]
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// ── Disputas ──────────────────────────────────────────────────

// Abrir disputa (cliente)
router.post('/disputas', async (req, res, next) => {
  try {
    const d = z.object({
      ordenId:      z.number().int().positive(),
      motivo:       z.enum(['REPUESTO_INCOMPATIBLE','PRODUCTO_DIFERENTE','PRODUCTO_DANADO',
                             'NO_RECIBIDO','GARANTIA_NO_RESPETADA','PRECIO_DIFERENTE',
                             'PIEZA_INCOMPLETA','OTRO']),
      descripcion:  z.string().min(10).max(2000),
      garantiaId:   z.number().int().positive().optional().nullable(),
    }).parse(req.body);

    // Verify order belongs to this client
    const [[orden]] = await db.query(
      'SELECT id, tenant_id FROM ordenes WHERE id = ? AND cliente_id = ? LIMIT 1',
      [d.ordenId, req.user.sub]
    );
    if (!orden) return notFound(res, 'Orden no encontrada');

    // Only one open dispute per order
    const [[existente]] = await db.query(
      `SELECT id FROM disputas WHERE orden_id = ? AND estado NOT IN ('RESUELTA_CLIENTE','RESUELTA_TIENDA','CERRADA') LIMIT 1`,
      [d.ordenId]
    );
    if (existente) return badRequest(res, 'Ya existe una disputa abierta para esta orden');

    const [r] = await db.query(
      `INSERT INTO disputas (tenant_id, orden_id, cliente_id, garantia_id, motivo, descripcion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orden.tenant_id, d.ordenId, req.user.sub, d.garantiaId ?? null, d.motivo, d.descripcion]
    );

    // Notify tenant
    const [propietarios] = await db.query(
      `SELECT id FROM usuarios WHERE tenant_id = ? AND tipo IN ('PROPIETARIO','ADMINISTRADOR') AND activo = 1`,
      [orden.tenant_id]
    );
    for (const p of propietarios) {
      await db.query(
        `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url_accion)
         VALUES (?, 'DISPUTA_ABIERTA', 'Nueva disputa abierta', ?, ?)`,
        [p.id, `Un cliente abrió una disputa: ${d.motivo}`, `/tienda/disputas`]
      );
    }

    audit(req, 'DISPUTA_ABIERTA', 'disputas', r.insertId, d);
    const [[disputa]] = await db.query('SELECT * FROM disputas WHERE id = ?', [r.insertId]);
    created(res, disputa, 'Disputa registrada. La tienda ha sido notificada.');
  } catch (err) { next(err); }
});

// Mis disputas (cliente)
router.get('/disputas/mis', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, t.nombre_comercial AS tienda_nombre, o.numero AS orden_numero
       FROM disputas d
       JOIN tenants t ON t.id = d.tenant_id
       JOIN ordenes o ON o.id = d.orden_id
       WHERE d.cliente_id = ?
       ORDER BY d.creado_en DESC`,
      [req.user.sub]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

// Disputas de la tienda
router.get('/disputas/tienda', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const estado = req.query.estado;
    const conds = ['d.tenant_id = ?'];
    const params = [req.user.tenantId];
    if (estado) { conds.push('d.estado = ?'); params.push(estado); }
    const where = `WHERE ${conds.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT d.id, d.motivo, d.estado, d.creado_en,
              u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
              o.numero AS orden_numero
       FROM disputas d
       JOIN usuarios u ON u.id = d.cliente_id
       JOIN ordenes o ON o.id = d.orden_id
       ${where}
       ORDER BY d.creado_en DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM disputas d ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Cambiar estado de disputa (tienda o admin)
router.patch('/disputas/:id/estado', async (req, res, next) => {
  try {
    const disputaId = Number(req.params.id);
    const { estado, resolucion } = z.object({
      estado: z.enum(['ESPERANDO_CLIENTE','ESPERANDO_TIENDA','EN_REVISION',
                      'RESUELTA_CLIENTE','RESUELTA_TIENDA','CERRADA']),
      resolucion: z.string().max(2000).optional().nullable(),
    }).parse(req.body);

    const [[d]] = await db.query(
      'SELECT id, tenant_id, cliente_id, estado FROM disputas WHERE id = ? LIMIT 1',
      [disputaId]
    );
    if (!d) return notFound(res, 'Disputa no encontrada');

    // Authorization: tienda or platform admin
    const isPlatform = PLATFORM_ROLES.includes(req.user.tipo);
    const isTienda = req.user.tenantId && req.user.tenantId === d.tenant_id &&
      [ROLES.PROPIETARIO, ROLES.ADMINISTRADOR].includes(req.user.tipo);

    if (!isPlatform && !isTienda) return forbidden(res, 'Sin permiso para gestionar esta disputa');

    const sets = ['estado = ?', 'actualizado_en = NOW()'];
    const vals = [estado];
    if (resolucion) { sets.push('resolucion = ?', 'resuelto_por = ?', 'resuelto_en = NOW()'); vals.push(resolucion, req.user.sub); }
    vals.push(disputaId);
    await db.query(`UPDATE disputas SET ${sets.join(', ')} WHERE id = ?`, vals);
    audit(req, `DISPUTA_${estado}`, 'disputas', disputaId, { estado, resolucion });
    ok(res, {}, 'Estado actualizado');
  } catch (err) { next(err); }
});

// Admin: todas las disputas
router.get('/admin/disputas', authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const estado = req.query.estado;
    const conds = ['1=1'];
    const params = [];
    if (estado) { conds.push('d.estado = ?'); params.push(estado); }
    const where = `WHERE ${conds.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT d.id, d.motivo, d.estado, d.creado_en,
              u.nombre AS cliente_nombre, t.nombre_comercial AS tienda_nombre,
              o.numero AS orden_numero
       FROM disputas d
       JOIN usuarios u ON u.id = d.cliente_id
       JOIN tenants t ON t.id = d.tenant_id
       JOIN ordenes o ON o.id = d.orden_id
       ${where}
       ORDER BY d.creado_en DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM disputas d ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

export default router;
