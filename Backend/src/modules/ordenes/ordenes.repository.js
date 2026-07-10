import db from '../../config/db.js';

function pad(n, len = 5) { return String(n).padStart(len, '0'); }

export async function generateNumero() {
  const now = new Date();
  const prefix = `SAB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [[{ cnt }]] = await db.query(
    `SELECT COUNT(*) AS cnt FROM ordenes WHERE numero LIKE ?`, [`${prefix}%`]
  );
  return `${prefix}-${pad(Number(cnt) + 1)}`;
}

export async function create({ tenantId, solicitudId, ofertaId, clienteId, numero, subtotal, costoEnvio, total, metodoEntrega }) {
  const [r] = await db.query(
    `INSERT INTO ordenes (tenant_id, solicitud_id, oferta_id, cliente_id, numero, subtotal, costo_envio, total, metodo_entrega)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, solicitudId ?? null, ofertaId ?? null, clienteId, numero, subtotal, costoEnvio, total, metodoEntrega ?? null]
  );
  return r.insertId;
}

export async function findById(id) {
  const [rows] = await db.query(
    `SELECT o.*,
            t.nombre_comercial AS tienda_nombre,
            u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            s.nombre_repuesto,
            of2.precio AS oferta_precio, of2.tipo_repuesto, of2.condicion,
            c.id AS calificacion_id, c.promedio AS calificacion_promedio
     FROM ordenes o
     JOIN tenants t ON t.id = o.tenant_id
     JOIN usuarios u ON u.id = o.cliente_id
     LEFT JOIN solicitudes s ON s.id = o.solicitud_id
     LEFT JOIN ofertas of2 ON of2.id = o.oferta_id
     LEFT JOIN calificaciones c ON c.orden_id = o.id
     WHERE o.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findByCliente(clienteId, { limit = 20, offset = 0, estado } = {}) {
  const conds = ['o.cliente_id = ?'];
  const params = [clienteId];
  if (estado) { conds.push('o.estado = ?'); params.push(estado); }
  const where = `WHERE ${conds.join(' AND ')}`;

  const [rows] = await db.query(
    `SELECT o.id, o.numero, o.estado, o.total, o.costo_envio, o.metodo_entrega, o.creado_en,
            t.nombre_comercial AS tienda_nombre,
            s.nombre_repuesto,
            c.id AS calificacion_id
     FROM ordenes o
     JOIN tenants t ON t.id = o.tenant_id
     LEFT JOIN solicitudes s ON s.id = o.solicitud_id
     LEFT JOIN calificaciones c ON c.orden_id = o.id
     ${where}
     ORDER BY o.creado_en DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM ordenes o ${where}`, params
  );
  return { rows, total };
}

export async function findByTenant(tenantId, { limit = 20, offset = 0, estado } = {}) {
  const conds = ['o.tenant_id = ?'];
  const params = [tenantId];
  if (estado) { conds.push('o.estado = ?'); params.push(estado); }
  const where = `WHERE ${conds.join(' AND ')}`;

  const [rows] = await db.query(
    `SELECT o.id, o.numero, o.estado, o.total, o.costo_envio, o.metodo_entrega, o.creado_en,
            u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            s.nombre_repuesto
     FROM ordenes o
     JOIN usuarios u ON u.id = o.cliente_id
     LEFT JOIN solicitudes s ON s.id = o.solicitud_id
     ${where}
     ORDER BY o.creado_en DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM ordenes o ${where}`, params
  );
  return { rows, total };
}

export async function findByOferta(ofertaId) {
  const [rows] = await db.query('SELECT * FROM ordenes WHERE oferta_id = ? LIMIT 1', [ofertaId]);
  return rows[0] || null;
}

export async function updateEstado(id, estado) {
  await db.query('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, id]);
}
