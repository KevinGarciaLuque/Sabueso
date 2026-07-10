import db from '../../config/db.js';

export async function create({ tenantId, ordenId, clienteId, calidad, compatibilidad, precio, atencion, rapidez, comentario }) {
  const [r] = await db.query(
    `INSERT INTO calificaciones (tenant_id, orden_id, cliente_id, calidad, compatibilidad, precio, atencion, rapidez, comentario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, ordenId, clienteId, calidad, compatibilidad, precio, atencion, rapidez, comentario ?? null]
  );
  // Actualizar promedio en insignias
  await db.query(
    `UPDATE tienda_insignias
     SET promedio_calificacion = (SELECT COALESCE(AVG(promedio), 0) FROM calificaciones WHERE tenant_id = ?),
         total_ventas = (SELECT COUNT(*) FROM ordenes WHERE tenant_id = ? AND estado = 'ENTREGADA')
     WHERE tenant_id = ?`,
    [tenantId, tenantId, tenantId]
  );
  return r.insertId;
}

export async function findByOrden(ordenId) {
  const [rows] = await db.query('SELECT * FROM calificaciones WHERE orden_id = ? LIMIT 1', [ordenId]);
  return rows[0] || null;
}

export async function findByTenant(tenantId, { limit = 20, offset = 0 } = {}) {
  const [rows] = await db.query(
    `SELECT c.*, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            s.nombre_repuesto
     FROM calificaciones c
     JOIN usuarios u ON u.id = c.cliente_id
     JOIN ordenes o ON o.id = c.orden_id
     LEFT JOIN solicitudes s ON s.id = o.solicitud_id
     WHERE c.tenant_id = ?
     ORDER BY c.creado_en DESC LIMIT ? OFFSET ?`,
    [tenantId, limit, offset]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM calificaciones WHERE tenant_id = ?', [tenantId]
  );
  return { rows, total };
}

export async function promedioTenant(tenantId) {
  const [[row]] = await db.query(
    `SELECT COALESCE(AVG(promedio), 0) AS promedio, COUNT(*) AS total
     FROM calificaciones WHERE tenant_id = ?`,
    [tenantId]
  );
  return row;
}
