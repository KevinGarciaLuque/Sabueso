import db from '../../config/db.js';

export async function findOrCreateConversacion({ solicitudId, ofertaId, clienteId, tenantId }) {
  const [existing] = await db.query(
    `SELECT * FROM conversaciones
     WHERE solicitud_id = ? AND tenant_id = ? AND cliente_id = ? LIMIT 1`,
    [solicitudId, tenantId, clienteId]
  );
  if (existing[0]) return existing[0];

  const [r] = await db.query(
    `INSERT INTO conversaciones (solicitud_id, oferta_id, cliente_id, tenant_id)
     VALUES (?, ?, ?, ?)`,
    [solicitudId, ofertaId || null, clienteId, tenantId]
  );
  const [rows] = await db.query('SELECT * FROM conversaciones WHERE id = ?', [r.insertId]);
  return rows[0];
}

export async function findConversacionById(id) {
  const [rows] = await db.query(
    `SELECT c.*,
            u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            t.nombre_comercial AS tienda_nombre,
            s.nombre_repuesto
     FROM conversaciones c
     JOIN usuarios u ON u.id = c.cliente_id
     JOIN tenants t  ON t.id = c.tenant_id
     JOIN solicitudes s ON s.id = c.solicitud_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findConversacionesByUser(usuarioId) {
  const [rows] = await db.query(
    `SELECT c.id, c.solicitud_id, c.tenant_id, c.ultimo_mensaje, c.ultimo_mensaje_en,
            c.mensajes_sin_leer_cliente, c.mensajes_sin_leer_tienda,
            u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            t.nombre_comercial AS tienda_nombre, t.logo_url AS tienda_logo,
            s.nombre_repuesto
     FROM conversaciones c
     JOIN usuarios u ON u.id = c.cliente_id
     JOIN tenants t  ON t.id = c.tenant_id
     JOIN solicitudes s ON s.id = c.solicitud_id
     WHERE c.cliente_id = ? AND c.activa = 1
     ORDER BY c.ultimo_mensaje_en DESC`,
    [usuarioId]
  );
  return rows;
}

export async function findConversacionesByTenant(tenantId) {
  const [rows] = await db.query(
    `SELECT c.id, c.solicitud_id, c.cliente_id, c.ultimo_mensaje, c.ultimo_mensaje_en,
            c.mensajes_sin_leer_cliente, c.mensajes_sin_leer_tienda,
            u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            s.nombre_repuesto, s.urgencia
     FROM conversaciones c
     JOIN usuarios u ON u.id = c.cliente_id
     JOIN solicitudes s ON s.id = c.solicitud_id
     WHERE c.tenant_id = ? AND c.activa = 1
     ORDER BY c.ultimo_mensaje_en DESC`,
    [tenantId]
  );
  return rows;
}

export async function getMensajes(conversacionId, { limit = 50, offset = 0 }) {
  const [rows] = await db.query(
    `SELECT m.*, u.nombre AS emisor_nombre, u.apellido AS emisor_apellido, u.avatar_url AS emisor_avatar
     FROM mensajes m
     JOIN usuarios u ON u.id = m.emisor_id
     WHERE m.conversacion_id = ?
     ORDER BY m.creado_en DESC LIMIT ? OFFSET ?`,
    [conversacionId, limit, offset]
  );
  return rows.reverse();
}

export async function saveMensaje({ conversacionId, emisorId, tipo = 'TEXTO', contenido, archivoUrl, emisorEsCliente }) {
  const [r] = await db.query(
    `INSERT INTO mensajes (conversacion_id, emisor_id, tipo, contenido, archivo_url)
     VALUES (?, ?, ?, ?, ?)`,
    [conversacionId, emisorId, tipo, contenido || null, archivoUrl || null]
  );
  // El receptor acumula el mensaje sin leer
  const campoReceptor = emisorEsCliente
    ? 'mensajes_sin_leer_tienda'
    : 'mensajes_sin_leer_cliente';
  await db.query(
    `UPDATE conversaciones SET
       ultimo_mensaje = ?, ultimo_mensaje_en = NOW(),
       ${campoReceptor} = ${campoReceptor} + 1
     WHERE id = ?`,
    [contenido?.slice(0, 200) || 'Archivo', conversacionId]
  );
  const [rows] = await db.query(
    `SELECT m.*, u.nombre AS emisor_nombre, u.apellido AS emisor_apellido, u.avatar_url AS emisor_avatar
     FROM mensajes m JOIN usuarios u ON u.id = m.emisor_id
     WHERE m.id = ?`, [r.insertId]
  );
  return rows[0];
}

// Total de mensajes sin leer para el badge del sidebar
export async function getUnreadTotal({ usuarioId, tenantId, esCliente }) {
  if (esCliente) {
    const [[{ total }]] = await db.query(
      `SELECT COALESCE(SUM(mensajes_sin_leer_cliente), 0) AS total
       FROM conversaciones WHERE cliente_id = ? AND activa = 1`,
      [usuarioId]
    );
    return Number(total) || 0;
  }
  const [[{ total }]] = await db.query(
    `SELECT COALESCE(SUM(mensajes_sin_leer_tienda), 0) AS total
     FROM conversaciones WHERE tenant_id = ? AND activa = 1`,
    [tenantId]
  );
  return Number(total) || 0;
}

export async function marcarLeidos(conversacionId, esCliente) {
  const campo = esCliente ? 'mensajes_sin_leer_cliente' : 'mensajes_sin_leer_tienda';
  await db.query(
    `UPDATE conversaciones SET ${campo} = 0 WHERE id = ?`,
    [conversacionId]
  );
  await db.query(
    `UPDATE mensajes SET leido = 1, leido_en = NOW()
     WHERE conversacion_id = ? AND leido = 0`,
    [conversacionId]
  );
}
