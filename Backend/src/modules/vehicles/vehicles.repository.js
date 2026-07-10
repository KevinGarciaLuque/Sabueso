import db from '../../config/db.js';

export async function create(usuarioId, data) {
  const { marcaId, modeloId, versionId, anio, motor, combustible, transmision, traccion, color, vin, placa, observaciones } = data;
  const [r] = await db.query(
    `INSERT INTO vehiculos (usuario_id, marca_id, modelo_id, version_id, anio, motor,
      combustible, transmision, traccion, color, vin, placa, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [usuarioId, marcaId || null, modeloId || null, versionId || null, anio,
     motor || null, combustible || null, transmision || null, traccion || null,
     color || null, vin || null, placa || null, observaciones || null]
  );
  return r.insertId;
}

export async function findByUser(usuarioId) {
  const [rows] = await db.query(
    `SELECT v.*, m.nombre AS marca_nombre, mo.nombre AS modelo_nombre, ve.nombre AS version_nombre
     FROM vehiculos v
     LEFT JOIN marcas m   ON m.id = v.marca_id
     LEFT JOIN modelos mo ON mo.id = v.modelo_id
     LEFT JOIN versiones ve ON ve.id = v.version_id
     WHERE v.usuario_id = ? AND v.activo = 1
     ORDER BY v.creado_en DESC`,
    [usuarioId]
  );
  return rows;
}

export async function findOne(id, usuarioId) {
  const [rows] = await db.query(
    `SELECT v.*, m.nombre AS marca_nombre, mo.nombre AS modelo_nombre
     FROM vehiculos v
     LEFT JOIN marcas m   ON m.id = v.marca_id
     LEFT JOIN modelos mo ON mo.id = v.modelo_id
     WHERE v.id = ? AND v.usuario_id = ? AND v.activo = 1 LIMIT 1`,
    [id, usuarioId]
  );
  return rows[0] || null;
}

export async function update(id, usuarioId, data) {
  const allowed = ['marca_id','modelo_id','version_id','anio','motor','combustible',
                   'transmision','traccion','color','vin','placa','observaciones','foto_url'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (!sets.length) return;
  vals.push(id, usuarioId);
  await db.query(`UPDATE vehiculos SET ${sets.join(', ')} WHERE id = ? AND usuario_id = ?`, vals);
}

export async function softDelete(id, usuarioId) {
  await db.query(
    'UPDATE vehiculos SET activo = 0 WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
}
