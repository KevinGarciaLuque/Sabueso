import { Router } from 'express';
import { z } from 'zod';
import db from '../../config/db.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { ROLES, PLATFORM_ROLES } from '../../constants/roles.js';
import { audit } from '../../utils/audit.js';

const router = Router();
router.use(authenticate);

// Ensure table exists (migrations fallback)
db.query(`
  CREATE TABLE IF NOT EXISTS productos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       INT UNSIGNED   NOT NULL,
    sucursal_id     INT UNSIGNED,
    categoria_id    SMALLINT UNSIGNED,
    nombre          VARCHAR(200)   NOT NULL,
    descripcion     TEXT,
    numero_oem      VARCHAR(80),
    numero_alterno  VARCHAR(80),
    marca_fabricante VARCHAR(100),
    tipo            ENUM('ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO',
                         'RECONSTRUIDO','ALTERNATIVO','DESARMADERO') NOT NULL DEFAULT 'GENERICO_NUEVO',
    condicion       ENUM('NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES') NOT NULL DEFAULT 'NUEVO',
    precio          DECIMAL(10,2)  NOT NULL DEFAULT 0,
    costo_envio     DECIMAL(10,2)  NOT NULL DEFAULT 0,
    existencia      SMALLINT       NOT NULL DEFAULT 0,
    garantia_dias   SMALLINT       NOT NULL DEFAULT 0,
    foto_url        VARCHAR(500),
    activo          TINYINT(1)     NOT NULL DEFAULT 1,
    creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_oem (numero_oem)
  )
`).catch(() => {});

const productoSchema = z.object({
  nombre:          z.string().min(2).max(200).trim(),
  descripcion:     z.string().max(1000).optional().nullable(),
  categoriaId:     z.number().int().positive().optional().nullable(),
  sucursalId:      z.number().int().positive().optional().nullable(),
  numeroOem:       z.string().max(80).optional().nullable(),
  numeroAlterno:   z.string().max(80).optional().nullable(),
  marcaFabricante: z.string().max(100).optional().nullable(),
  tipo:            z.enum(['ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO',
                           'RECONSTRUIDO','ALTERNATIVO','DESARMADERO']).optional(),
  condicion:       z.enum(['NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES']).optional(),
  precio:          z.number().min(0).optional(),
  costoEnvio:      z.number().min(0).optional(),
  existencia:      z.number().int().min(0).optional(),
  garantiaDias:    z.number().int().min(0).optional(),
  fotoUrl:         z.string().url().max(500).optional().nullable(),
});

// Listar inventario de la tienda
router.get('/', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.VENDEDOR, ROLES.BODEGA), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const conds = ['p.tenant_id = ?'];
    const params = [req.user.tenantId];

    if (req.query.q) {
      conds.push('(p.nombre LIKE ? OR p.numero_oem LIKE ? OR p.numero_alterno LIKE ?)');
      const like = `%${req.query.q}%`;
      params.push(like, like, like);
    }
    if (req.query.categoriaId) {
      conds.push('p.categoria_id = ?');
      params.push(req.query.categoriaId);
    }
    if (req.query.soloDisponible === 'true') {
      conds.push('p.existencia > 0');
    }

    const where = `WHERE ${conds.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT p.id, p.nombre, p.numero_oem, p.numero_alterno, p.marca_fabricante,
              p.tipo, p.condicion, p.precio, p.existencia, p.garantia_dias,
              p.foto_url, p.activo, p.creado_en,
              c.nombre AS categoria_nombre,
              s.nombre AS sucursal_nombre
       FROM productos p
       LEFT JOIN categorias_repuestos c ON c.id = p.categoria_id
       LEFT JOIN sucursales s ON s.id = p.sucursal_id
       ${where} AND p.activo = 1
       ORDER BY p.nombre LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM productos p ${where} AND p.activo = 1`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

// Crear producto
router.post('/', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.BODEGA), async (req, res, next) => {
  try {
    const d = productoSchema.parse(req.body);
    const [r] = await db.query(
      `INSERT INTO productos
         (tenant_id, sucursal_id, categoria_id, nombre, descripcion,
          numero_oem, numero_alterno, marca_fabricante, tipo, condicion,
          precio, costo_envio, existencia, garantia_dias, foto_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.tenantId, d.sucursalId ?? null, d.categoriaId ?? null,
       d.nombre, d.descripcion ?? null, d.numeroOem ?? null, d.numeroAlterno ?? null,
       d.marcaFabricante ?? null, d.tipo ?? 'GENERICO_NUEVO', d.condicion ?? 'NUEVO',
       d.precio ?? 0, d.costoEnvio ?? 0, d.existencia ?? 0, d.garantiaDias ?? 0,
       d.fotoUrl ?? null]
    );
    audit(req, 'PRODUCTO_CREADO', 'productos', r.insertId, d);
    const [[prod]] = await db.query('SELECT * FROM productos WHERE id = ?', [r.insertId]);
    created(res, prod, 'Producto creado');
  } catch (err) { next(err); }
});

// Obtener producto
router.get('/:id', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.VENDEDOR, ROLES.BODEGA), async (req, res, next) => {
  try {
    const [[prod]] = await db.query(
      `SELECT p.*, c.nombre AS categoria_nombre, s.nombre AS sucursal_nombre
       FROM productos p
       LEFT JOIN categorias_repuestos c ON c.id = p.categoria_id
       LEFT JOIN sucursales s ON s.id = p.sucursal_id
       WHERE p.id = ? AND p.tenant_id = ? LIMIT 1`,
      [Number(req.params.id), req.user.tenantId]
    );
    if (!prod) return notFound(res, 'Producto no encontrado');
    ok(res, prod);
  } catch (err) { next(err); }
});

// Actualizar producto
router.patch('/:id', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.BODEGA), async (req, res, next) => {
  try {
    const prodId = Number(req.params.id);
    const [[prod]] = await db.query(
      'SELECT id FROM productos WHERE id = ? AND tenant_id = ? LIMIT 1',
      [prodId, req.user.tenantId]
    );
    if (!prod) return notFound(res, 'Producto no encontrado');

    const d = productoSchema.partial().parse(req.body);
    const sets = []; const vals = [];
    if (d.nombre          !== undefined) { sets.push('nombre = ?');           vals.push(d.nombre); }
    if (d.descripcion     !== undefined) { sets.push('descripcion = ?');      vals.push(d.descripcion); }
    if (d.categoriaId     !== undefined) { sets.push('categoria_id = ?');     vals.push(d.categoriaId); }
    if (d.sucursalId      !== undefined) { sets.push('sucursal_id = ?');      vals.push(d.sucursalId); }
    if (d.numeroOem       !== undefined) { sets.push('numero_oem = ?');       vals.push(d.numeroOem); }
    if (d.numeroAlterno   !== undefined) { sets.push('numero_alterno = ?');   vals.push(d.numeroAlterno); }
    if (d.marcaFabricante !== undefined) { sets.push('marca_fabricante = ?'); vals.push(d.marcaFabricante); }
    if (d.tipo            !== undefined) { sets.push('tipo = ?');             vals.push(d.tipo); }
    if (d.condicion       !== undefined) { sets.push('condicion = ?');        vals.push(d.condicion); }
    if (d.precio          !== undefined) { sets.push('precio = ?');           vals.push(d.precio); }
    if (d.costoEnvio      !== undefined) { sets.push('costo_envio = ?');      vals.push(d.costoEnvio); }
    if (d.existencia      !== undefined) { sets.push('existencia = ?');       vals.push(d.existencia); }
    if (d.garantiaDias    !== undefined) { sets.push('garantia_dias = ?');    vals.push(d.garantiaDias); }
    if (d.fotoUrl         !== undefined) { sets.push('foto_url = ?');         vals.push(d.fotoUrl); }

    if (sets.length) {
      vals.push(prodId);
      await db.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
    audit(req, 'PRODUCTO_ACTUALIZADO', 'productos', prodId, d);
    ok(res, {}, 'Producto actualizado');
  } catch (err) { next(err); }
});

// Desactivar producto
router.delete('/:id', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const prodId = Number(req.params.id);
    const [[prod]] = await db.query(
      'SELECT id FROM productos WHERE id = ? AND tenant_id = ? LIMIT 1',
      [prodId, req.user.tenantId]
    );
    if (!prod) return notFound(res, 'Producto no encontrado');
    await db.query('UPDATE productos SET activo = 0 WHERE id = ?', [prodId]);
    audit(req, 'PRODUCTO_DESACTIVADO', 'productos', prodId, {});
    ok(res, {}, 'Producto eliminado');
  } catch (err) { next(err); }
});

// Actualizar stock rápido (+/-)
router.patch('/:id/stock', authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR, ROLES.BODEGA), async (req, res, next) => {
  try {
    const prodId = Number(req.params.id);
    const { delta } = z.object({ delta: z.number().int() }).parse(req.body);
    const [[prod]] = await db.query(
      'SELECT id, existencia FROM productos WHERE id = ? AND tenant_id = ? LIMIT 1',
      [prodId, req.user.tenantId]
    );
    if (!prod) return notFound(res, 'Producto no encontrado');
    const nueva = Math.max(0, prod.existencia + delta);
    await db.query('UPDATE productos SET existencia = ? WHERE id = ?', [nueva, prodId]);
    ok(res, { existencia: nueva }, 'Stock actualizado');
  } catch (err) { next(err); }
});

export default router;
