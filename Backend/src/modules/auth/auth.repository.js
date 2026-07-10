import db from '../../config/db.js';

export async function findByEmail(email) {
  const [rows] = await db.query(
    `SELECT u.*, t.nombre_comercial AS tenant_nombre, t.estado AS tenant_estado
     FROM usuarios u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findById(id) {
  const [rows] = await db.query(
    `SELECT u.id, u.tenant_id, u.nombre, u.apellido, u.email, u.tipo,
            u.avatar_url, u.email_verificado, u.activo, u.dos_factores,
            u.creado_en, t.nombre_comercial AS tenant_nombre
     FROM usuarios u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ nombre, apellido, email, passwordHash, tipo, tenantId = null, tokenVerificacion }) {
  const [result] = await db.query(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, tipo, tenant_id, token_verificacion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellido, email, passwordHash, tipo, tenantId, tokenVerificacion]
  );
  return result.insertId;
}

export async function updateRefreshToken(userId, refreshToken) {
  await db.query(
    'UPDATE usuarios SET refresh_token = ?, ultimo_acceso = NOW() WHERE id = ?',
    [refreshToken, userId]
  );
}

export async function findByRefreshToken(refreshToken) {
  const [rows] = await db.query(
    'SELECT * FROM usuarios WHERE refresh_token = ? AND activo = 1 LIMIT 1',
    [refreshToken]
  );
  return rows[0] || null;
}

export async function clearRefreshToken(userId) {
  await db.query('UPDATE usuarios SET refresh_token = NULL WHERE id = ?', [userId]);
}

export async function verifyEmail(token) {
  const [result] = await db.query(
    `UPDATE usuarios SET email_verificado = 1, token_verificacion = NULL
     WHERE token_verificacion = ? AND email_verificado = 0`,
    [token]
  );
  return result.affectedRows > 0;
}

export async function setResetToken(email, token, expira) {
  const [result] = await db.query(
    'UPDATE usuarios SET token_reset = ?, token_reset_exp = ? WHERE email = ? AND activo = 1',
    [token, expira, email]
  );
  return result.affectedRows > 0;
}

export async function findByResetToken(token) {
  const [rows] = await db.query(
    'SELECT * FROM usuarios WHERE token_reset = ? AND token_reset_exp > NOW() LIMIT 1',
    [token]
  );
  return rows[0] || null;
}

export async function updatePassword(userId, passwordHash) {
  await db.query(
    'UPDATE usuarios SET password_hash = ?, token_reset = NULL, token_reset_exp = NULL WHERE id = ?',
    [passwordHash, userId]
  );
}

export async function logAccess(email, ip, userAgent, exitoso) {
  await db.query(
    'INSERT INTO intentos_acceso (email, ip, user_agent, exitoso) VALUES (?, ?, ?, ?)',
    [email, ip, userAgent, exitoso ? 1 : 0]
  );
}

export async function countRecentFailedAttempts(email, minutes = 15) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM intentos_acceso
     WHERE email = ? AND exitoso = 0 AND creado_en > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [email, minutes]
  );
  return rows[0].total;
}

export async function updateUserFields(userId, sets, vals) {
  await db.query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`,
    vals
  );
}

export async function findPasswordHash(userId) {
  const [rows] = await db.query(
    'SELECT id, password_hash FROM usuarios WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

