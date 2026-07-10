import db from '../../config/db.js';

export async function create({ usuarioId, tipo, titulo, cuerpo, urlAccion, datos }) {
  const [r] = await db.query(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url_accion, datos)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, tipo, titulo, cuerpo || null, urlAccion || null, datos ? JSON.stringify(datos) : null]
  );
  return r.insertId;
}

export async function findByUser(usuarioId, { limit = 20, offset = 0, soloNoLeidas = false }) {
  const where = soloNoLeidas ? 'AND leida = 0' : '';
  const [rows] = await db.query(
    `SELECT * FROM notificaciones
     WHERE usuario_id = ? ${where}
     ORDER BY creado_en DESC LIMIT ? OFFSET ?`,
    [usuarioId, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? ${where}`,
    [usuarioId]
  );
  return { rows, total };
}

export async function markAsRead(id, usuarioId) {
  await db.query(
    'UPDATE notificaciones SET leida = 1, leida_en = NOW() WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
}

export async function markAllAsRead(usuarioId) {
  await db.query(
    'UPDATE notificaciones SET leida = 1, leida_en = NOW() WHERE usuario_id = ? AND leida = 0',
    [usuarioId]
  );
}

export async function countUnread(usuarioId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = 0',
    [usuarioId]
  );
  return total;
}
