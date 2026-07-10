import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { ROLES, PLATFORM_ROLES } from '../../constants/roles.js';
import db from '../../config/db.js';

const router = Router();

// Ensure reportes table exists on startup
db.query(`
  CREATE TABLE IF NOT EXISTS reportes_usuarios (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reportado_por INT UNSIGNED NOT NULL,
    tenant_id     INT UNSIGNED,
    tipo          ENUM('SPAM','PRECIO_INCORRECTO','OFERTA_FALSA','MALA_ATENCION','FRAUDE','OTRO')
                  NOT NULL DEFAULT 'OTRO',
    descripcion   TEXT,
    estado        ENUM('ABIERTO','EN_REVISION','RESUELTO','DESCARTADO') NOT NULL DEFAULT 'ABIERTO',
    nota_admin    TEXT,
    resuelto_por  INT UNSIGNED,
    resuelto_en   DATETIME,
    creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reportado_por) REFERENCES usuarios(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    INDEX idx_estado (estado),
    INDEX idx_creado (creado_en)
  )
`).catch(() => {});

// ── Dashboard stats ────────────────────────────────────────────

router.get('/stats', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants WHERE estado = 'VERIFICADA')    AS tiendas_verificadas,
        (SELECT COUNT(*) FROM tenants WHERE estado = 'PENDIENTE')     AS tiendas_pendientes,
        (SELECT COUNT(*) FROM tenants WHERE estado = 'EN_REVISION')   AS tiendas_revision,
        (SELECT COUNT(*) FROM tenants WHERE estado = 'SUSPENDIDA')    AS tiendas_suspendidas,
        (SELECT COUNT(*) FROM tenant_suscripciones WHERE estado = 'ACTIVA')   AS membresias_activas,
        (SELECT COUNT(*) FROM tenant_suscripciones WHERE estado = 'VENCIDA')  AS membresias_vencidas,
        (SELECT COUNT(*) FROM tenant_suscripciones WHERE estado = 'PRUEBA')   AS membresias_prueba,
        (SELECT IFNULL(SUM(p.precio),0)
           FROM tenant_suscripciones ts JOIN planes p ON p.id = ts.plan_id
           WHERE ts.estado = 'ACTIVA')                                AS mrr,
        (SELECT COUNT(*) FROM solicitudes WHERE estado NOT IN ('BORRADOR','CANCELADA')) AS solicitudes_activas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'COMPLETADA')         AS solicitudes_completadas,
        (SELECT COUNT(*) FROM solicitudes
         WHERE DATE(creado_en) = CURDATE() AND estado != 'BORRADOR')           AS solicitudes_hoy,
        (SELECT COUNT(*) FROM ofertas)                                          AS total_ofertas,
        (SELECT COUNT(*) FROM ofertas WHERE DATE(creado_en) = CURDATE())        AS ofertas_hoy,
        (SELECT IFNULL(AVG(t.cnt),0)
           FROM (SELECT COUNT(*) cnt FROM ofertas GROUP BY solicitud_id) t)     AS avg_ofertas,
        (SELECT COUNT(*) FROM usuarios
         WHERE tipo IN ('CLIENTE','MECANICO','TALLER','EMPRESA','FLOTILLA'))    AS total_clientes,
        (SELECT COUNT(*) FROM reportes_usuarios WHERE estado = 'ABIERTO')       AS reportes_abiertos
    `);

    const [ciudades] = await db.query(`
      SELECT ciudad, COUNT(*) AS total
      FROM solicitudes
      WHERE ciudad IS NOT NULL AND ciudad != ''
        AND estado NOT IN ('BORRADOR','CANCELADA')
      GROUP BY ciudad ORDER BY total DESC LIMIT 6
    `);

    const [repuestos] = await db.query(`
      SELECT nombre_repuesto, COUNT(*) AS total
      FROM solicitudes
      WHERE estado NOT IN ('BORRADOR','CANCELADA')
      GROUP BY nombre_repuesto ORDER BY total DESC LIMIT 10
    `);

    const [actividadSemanal] = await db.query(`
      SELECT
        YEARWEEK(creado_en, 1) AS semana,
        COUNT(*) AS solicitudes,
        DATE_FORMAT(MIN(creado_en), '%d/%m') AS label
      FROM solicitudes
      WHERE creado_en >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
        AND estado != 'BORRADOR'
      GROUP BY semana ORDER BY semana
    `);

    const [planesDist] = await db.query(`
      SELECT p.nombre, COUNT(ts.id) AS total
      FROM tenant_suscripciones ts
      JOIN planes p ON p.id = ts.plan_id
      WHERE ts.estado IN ('ACTIVA','PRUEBA')
      GROUP BY p.id, p.nombre ORDER BY total DESC
    `);

    ok(res, { stats, ciudades, repuestos, actividadSemanal, planesDist });
  } catch (err) { next(err); }
});

// ── Reportes de usuarios ───────────────────────────────────────

const reporteSchema = z.object({
  tenantId:    z.number().int().positive().optional(),
  tipo:        z.enum(['SPAM','PRECIO_INCORRECTO','OFERTA_FALSA','MALA_ATENCION','FRAUDE','OTRO']).default('OTRO'),
  descripcion: z.string().min(10).max(1000),
});

// Cualquier usuario autenticado puede crear un reporte
router.post('/reportes', authenticate, async (req, res, next) => {
  try {
    const data = reporteSchema.parse(req.body);
    const [r] = await db.query(
      `INSERT INTO reportes_usuarios (reportado_por, tenant_id, tipo, descripcion)
       VALUES (?, ?, ?, ?)`,
      [req.user.sub, data.tenantId ?? null, data.tipo, data.descripcion]
    );
    created(res, { id: r.insertId }, 'Reporte enviado');
  } catch (err) { next(err); }
});

router.get('/admin/reportes', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const estado  = req.query.estado;
    const conds   = [];
    const params  = [];
    if (estado) { conds.push('r.estado = ?'); params.push(estado); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT r.*,
              u.nombre AS reportante_nombre, u.email AS reportante_email, u.tipo AS reportante_tipo,
              t.nombre_comercial AS tienda_nombre,
              adm.nombre AS resuelto_por_nombre
       FROM reportes_usuarios r
       JOIN usuarios u ON u.id = r.reportado_por
       LEFT JOIN tenants  t   ON t.id   = r.tenant_id
       LEFT JOIN usuarios adm ON adm.id = r.resuelto_por
       ${where}
       ORDER BY r.creado_en DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM reportes_usuarios r ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

router.patch('/admin/reportes/:id', authenticate, authorize(...PLATFORM_ROLES), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado, notaAdmin } = z.object({
      estado:    z.enum(['EN_REVISION','RESUELTO','DESCARTADO']),
      notaAdmin: z.string().max(1000).optional(),
    }).parse(req.body);

    const [[r]] = await db.query('SELECT id FROM reportes_usuarios WHERE id = ? LIMIT 1', [id]);
    if (!r) return notFound(res, 'Reporte no encontrado');

    const terminal = ['RESUELTO','DESCARTADO'].includes(estado);
    await db.query(
      `UPDATE reportes_usuarios
       SET estado = ?, nota_admin = ?,
           resuelto_por = ?,
           resuelto_en  = ${terminal ? 'NOW()' : 'resuelto_en'}
       WHERE id = ?`,
      [estado, notaAdmin ?? null, req.user.sub, id]
    );
    ok(res, {}, 'Reporte actualizado');
  } catch (err) { next(err); }
});

// ── Auditoría ─────────────────────────────────────────────────

router.get('/admin/auditoria', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const accion   = req.query.accion;
    const tenantId = req.query.tenantId;
    const conds    = [];
    const params   = [];
    if (accion)   { conds.push('a.accion LIKE ?');     params.push(`%${accion}%`); }
    if (tenantId) { conds.push('a.tenant_id = ?');     params.push(Number(tenantId)); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT a.id, a.accion, a.tabla, a.registro_id, a.ip, a.creado_en,
              u.nombre, u.email, u.tipo AS usuario_tipo,
              t.nombre_comercial AS tenant_nombre
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN tenants  t ON t.id = a.tenant_id
       ${where}
       ORDER BY a.creado_en DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM auditoria a ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// ── Intentos de acceso ─────────────────────────────────────────

router.get('/admin/intentos', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const soloFallidos = req.query.fallidos === '1';
    const where = soloFallidos ? 'WHERE exitoso = 0' : '';
    const params = [];

    const [rows] = await db.query(
      `SELECT * FROM intentos_acceso ${where} ORDER BY creado_en DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM intentos_acceso ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

export default router;
