import db from '../../config/db.js';

export async function create(usuarioId, data) {
  const {
    vehiculoId, categoriaId, nombreRepuesto, descripcion, lado, posicion,
    cantidad, numeroPieza, condicionAceptada, presupuestoMin, presupuestoMax,
    ciudad, departamento, latitud, longitud, metodoEntrega, urgencia, fechaLimite, esPrivada,
  } = data;

  const fechaLimiteSql = fechaLimite
    ? new Date(fechaLimite).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const [r] = await db.query(
    `INSERT INTO solicitudes
     (usuario_id, vehiculo_id, categoria_id, nombre_repuesto, descripcion, lado, posicion,
      cantidad, numero_pieza, condicion_aceptada, presupuesto_min, presupuesto_max,
      ciudad, departamento, latitud, longitud, metodo_entrega, urgencia, fecha_limite, es_privada)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [usuarioId, vehiculoId || null, categoriaId || null, nombreRepuesto, descripcion || null,
     lado || null, posicion || null, cantidad || 1, numeroPieza || null,
     condicionAceptada || 'CUALQUIERA', presupuestoMin || null, presupuestoMax || null,
     ciudad || null, departamento || null, latitud || null, longitud || null,
     metodoEntrega || 'CUALQUIERA', urgencia || 'MEDIA', fechaLimiteSql, esPrivada ? 1 : 0]
  );
  return r.insertId;
}

export async function findById(id) {
  const [rows] = await db.query(
    `SELECT s.*,
            u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
            v.anio, v.motor, v.vin,
            m.nombre AS marca_nombre, mo.nombre AS modelo_nombre,
            c.nombre AS categoria_nombre
     FROM solicitudes s
     LEFT JOIN usuarios u  ON u.id = s.usuario_id
     LEFT JOIN vehiculos v ON v.id = s.vehiculo_id
     LEFT JOIN marcas m    ON m.id = v.marca_id
     LEFT JOIN modelos mo  ON mo.id = v.modelo_id
     LEFT JOIN categorias_repuestos c ON c.id = s.categoria_id
     WHERE s.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findByUser(usuarioId, { limit, offset, estado }) {
  const conds = ['s.usuario_id = ?'];
  const params = [usuarioId];
  if (estado) { conds.push('s.estado = ?'); params.push(estado); }

  const [rows] = await db.query(
    `SELECT s.id, s.nombre_repuesto, s.estado, s.urgencia, s.ciudad,
            s.total_ofertas, s.vistas, s.creado_en, s.fecha_limite,
            m.nombre AS marca_nombre, mo.nombre AS modelo_nombre, v.anio
     FROM solicitudes s
     LEFT JOIN vehiculos v ON v.id = s.vehiculo_id
     LEFT JOIN marcas m    ON m.id = v.marca_id
     LEFT JOIN modelos mo  ON mo.id = v.modelo_id
     WHERE ${conds.join(' AND ')}
     ORDER BY s.creado_en DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM solicitudes s WHERE ${conds.join(' AND ')}`, params
  );
  return { rows, total };
}

export async function findPublic({ limit, offset, marcaId, modeloId, categoriaId, ciudad, urgencia, busqueda }) {
  const conds = ["s.estado IN ('PUBLICADA','RECIBIENDO_OFERTAS')"];
  const params = [];

  if (marcaId)    { conds.push('v.marca_id = ?');      params.push(marcaId); }
  if (modeloId)   { conds.push('v.modelo_id = ?');     params.push(modeloId); }
  if (categoriaId){ conds.push('s.categoria_id = ?');  params.push(categoriaId); }
  if (ciudad)     { conds.push('s.ciudad LIKE ?');     params.push(`%${ciudad}%`); }
  if (urgencia)   { conds.push('s.urgencia = ?');      params.push(urgencia); }
  if (busqueda)   { conds.push('s.nombre_repuesto LIKE ?'); params.push(`%${busqueda}%`); }

  const [rows] = await db.query(
    `SELECT s.id, s.nombre_repuesto, s.estado, s.urgencia, s.ciudad,
            s.condicion_aceptada, s.presupuesto_max, s.total_ofertas,
            s.creado_en, s.fecha_limite,
            CONCAT(u.nombre, ' ', LEFT(u.apellido, 1), '.') AS cliente,
            m.nombre AS marca_nombre, mo.nombre AS modelo_nombre, v.anio, v.motor
     FROM solicitudes s
     LEFT JOIN usuarios u  ON u.id = s.usuario_id
     LEFT JOIN vehiculos v ON v.id = s.vehiculo_id
     LEFT JOIN marcas m    ON m.id = v.marca_id
     LEFT JOIN modelos mo  ON mo.id = v.modelo_id
     WHERE ${conds.join(' AND ')}
     ORDER BY
       CASE s.urgencia WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 ELSE 4 END,
       s.creado_en DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM solicitudes s
     LEFT JOIN vehiculos v ON v.id = s.vehiculo_id
     WHERE ${conds.join(' AND ')}`,
    params
  );
  return { rows, total };
}

export async function updateEstado(id, usuarioId, estadoNuevo, estadoAnterior, nota = null) {
  await db.query(
    'UPDATE solicitudes SET estado = ? WHERE id = ? AND usuario_id = ?',
    [estadoNuevo, id, usuarioId]
  );
  await db.query(
    `INSERT INTO solicitud_historial (solicitud_id, usuario_id, estado_anterior, estado_nuevo, nota)
     VALUES (?, ?, ?, ?, ?)`,
    [id, usuarioId, estadoAnterior, estadoNuevo, nota]
  );
}

export async function addImage(solicitudId, url, orden = 0) {
  await db.query(
    'INSERT INTO solicitud_imagenes (solicitud_id, url, orden) VALUES (?, ?, ?)',
    [solicitudId, url, orden]
  );
}

export async function getImages(solicitudId) {
  const [rows] = await db.query(
    'SELECT * FROM solicitud_imagenes WHERE solicitud_id = ? ORDER BY orden',
    [solicitudId]
  );
  return rows;
}

export async function incrementVistas(id) {
  await db.query('UPDATE solicitudes SET vistas = vistas + 1 WHERE id = ?', [id]);
}

export async function incrementOfertas(id) {
  await db.query(
    `UPDATE solicitudes SET total_ofertas = total_ofertas + 1,
     estado = CASE WHEN estado = 'PUBLICADA' THEN 'RECIBIENDO_OFERTAS' ELSE estado END
     WHERE id = ?`,
    [id]
  );
}
