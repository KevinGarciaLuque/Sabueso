import db from '../../config/db.js';

export async function create({ nombreComercial, razonSocial, rtn, slug, telefono, email, descripcion }) {
  const [r] = await db.query(
    `INSERT INTO tenants (nombre_comercial, razon_social, rtn, slug, telefono, email, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombreComercial, razonSocial || null, rtn || null, slug, telefono || null, email, descripcion || null]
  );
  return r.insertId;
}

export async function findById(id) {
  const [rows] = await db.query(
    `SELECT t.*, ts.estado AS suscripcion_estado, p.nombre AS plan_nombre, p.codigo AS plan_codigo
     FROM tenants t
     LEFT JOIN tenant_suscripciones ts ON ts.tenant_id = t.id AND ts.estado IN ('ACTIVA','PRUEBA')
     LEFT JOIN planes p ON p.id = ts.plan_id
     WHERE t.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findBySlug(slug) {
  const [rows] = await db.query('SELECT * FROM tenants WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

export async function findByEmail(email) {
  const [rows] = await db.query('SELECT * FROM tenants WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

export async function findAll({ limit, offset, estado, busqueda }) {
  const conds = [];
  const params = [];
  if (estado)   { conds.push('t.estado = ?');               params.push(estado); }
  if (busqueda) { conds.push('t.nombre_comercial LIKE ?');  params.push(`%${busqueda}%`); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT t.id, t.nombre_comercial, t.slug, t.estado, t.email, t.telefono,
            t.creado_en, ts.estado AS suscripcion_estado, p.nombre AS plan_nombre
     FROM tenants t
     LEFT JOIN tenant_suscripciones ts ON ts.tenant_id = t.id AND ts.estado IN ('ACTIVA','PRUEBA')
     LEFT JOIN planes p ON p.id = ts.plan_id
     ${where}
     ORDER BY t.creado_en DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM tenants t ${where}`, params
  );
  return { rows, total };
}

export async function updateEstado(id, estado) {
  await db.query('UPDATE tenants SET estado = ? WHERE id = ?', [estado, id]);
}

export async function update(id, fields) {
  const allowed = ['nombre_comercial','razon_social','rtn','telefono','descripcion','logo_url','politica_garantia'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (!sets.length) return;
  vals.push(id);
  await db.query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function createSuscripcion({ tenantId, planId, fechaInicio, fechaFin, estado = 'PRUEBA' }) {
  const [r] = await db.query(
    `INSERT INTO tenant_suscripciones (tenant_id, plan_id, estado, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, ?, ?)`,
    [tenantId, planId, estado, fechaInicio, fechaFin || null]
  );
  return r.insertId;
}

export async function createInsignias(tenantId) {
  await db.query(
    'INSERT IGNORE INTO tienda_insignias (tenant_id) VALUES (?)',
    [tenantId]
  );
}

export async function createSucursalPrincipal({ tenantId, nombre, ciudad, departamento, telefono, email }) {
  const [r] = await db.query(
    `INSERT INTO sucursales (tenant_id, nombre, ciudad, departamento, telefono, email, es_principal)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [tenantId, nombre, ciudad || null, departamento || null, telefono || null, email || null]
  );
  return r.insertId;
}
