import db from '../../config/db.js';

export async function create(tenantId, data) {
  const {
    sucursalId, solicitudId, vendedorId, precio, costoEnvio, tipoRepuesto, condicion,
    marcaFabricante, numeroOem, numeroAlterno, garantiaDias, disponibilidad,
    metodoEntrega, metodosPago, compatibilidad, incluyeAccesorios,
    requierePiezaVieja, requiereAdaptacion, observaciones, venceEn,
  } = data;
  const [r] = await db.query(
    `INSERT INTO ofertas
     (tenant_id, sucursal_id, solicitud_id, vendedor_id, precio, costo_envio,
      tipo_repuesto, condicion, marca_fabricante, numero_oem, numero_alterno,
      garantia_dias, disponibilidad, metodo_entrega, metodos_pago, compatibilidad,
      incluye_accesorios, requiere_pieza_vieja, requiere_adaptacion, observaciones, vence_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [tenantId, sucursalId || null, solicitudId, vendedorId || null,
     precio, costoEnvio || 0, tipoRepuesto || 'GENERICO_NUEVO', condicion || 'NUEVO',
     marcaFabricante || null, numeroOem || null, numeroAlterno || null,
     garantiaDias || 0, disponibilidad || 'INMEDIATA', metodoEntrega || 'RETIRO',
     metodosPago ? JSON.stringify(metodosPago) : null,
     compatibilidad || 'POR_REVISAR', incluyeAccesorios ? 1 : 0,
     requierePiezaVieja ? 1 : 0, requiereAdaptacion ? 1 : 0,
     observaciones || null, venceEn || null]
  );
  return r.insertId;
}

export async function findBySolicitud(solicitudId) {
  const [rows] = await db.query(
    `SELECT o.*,
            t.nombre_comercial AS tienda_nombre, t.logo_url AS tienda_logo,
            ti.promedio_calificacion AS tienda_rating, ti.verificada AS tienda_verificada,
            ti.total_ventas AS tienda_ventas,
            s.ciudad AS sucursal_ciudad,
            (SELECT COUNT(*) FROM calificaciones WHERE tenant_id = o.tenant_id) AS total_calificaciones
     FROM ofertas o
     JOIN tenants t    ON t.id = o.tenant_id
     LEFT JOIN tienda_insignias ti ON ti.tenant_id = o.tenant_id
     LEFT JOIN sucursales s ON s.id = o.sucursal_id
     WHERE o.solicitud_id = ? AND o.estado NOT IN ('RETIRADA')
     ORDER BY o.precio_total ASC`,
    [solicitudId]
  );
  return rows;
}

export async function findByTenant(tenantId, { limit, offset, estado }) {
  const conds = ['o.tenant_id = ?'];
  const params = [tenantId];
  if (estado) { conds.push('o.estado = ?'); params.push(estado); }

  const [rows] = await db.query(
    `SELECT o.id, o.solicitud_id, o.precio, o.precio_total, o.estado,
            o.tipo_repuesto, o.compatibilidad, o.creado_en,
            s.nombre_repuesto, s.ciudad AS solicitud_ciudad,
            s.urgencia, s.estado AS solicitud_estado
     FROM ofertas o
     JOIN solicitudes s ON s.id = o.solicitud_id
     WHERE ${conds.join(' AND ')}
     ORDER BY o.creado_en DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM ofertas o WHERE ${conds.join(' AND ')}`, params
  );
  return { rows, total };
}

export async function findById(id) {
  const [rows] = await db.query(
    'SELECT * FROM ofertas WHERE id = ? LIMIT 1', [id]
  );
  return rows[0] || null;
}

export async function updateEstado(id, estado) {
  await db.query('UPDATE ofertas SET estado = ? WHERE id = ?', [estado, id]);
}

export async function addImage(ofertaId, url, tipo = 'FOTO', orden = 0) {
  await db.query(
    'INSERT INTO oferta_imagenes (oferta_id, url, tipo, orden) VALUES (?, ?, ?, ?)',
    [ofertaId, url, tipo, orden]
  );
}

export async function getImages(ofertaId) {
  const [rows] = await db.query(
    'SELECT * FROM oferta_imagenes WHERE oferta_id = ? ORDER BY orden',
    [ofertaId]
  );
  return rows;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function scoreOfertas(solicitudId) {
  // Retorna ofertas con score calculado para "Mejor oferta":
  // precio + reputación + garantía + rapidez + compatibilidad + distancia + historial de ventas
  const [rows] = await db.query(
    `SELECT o.id, o.precio_total, o.garantia_dias, o.disponibilidad, o.compatibilidad,
            ti.promedio_calificacion, ti.total_ventas,
            sol.latitud AS sol_lat, sol.longitud AS sol_lng,
            suc.latitud AS suc_lat, suc.longitud AS suc_lng
     FROM ofertas o
     JOIN solicitudes sol ON sol.id = o.solicitud_id
     LEFT JOIN tienda_insignias ti ON ti.tenant_id = o.tenant_id
     LEFT JOIN sucursales suc ON suc.id = o.sucursal_id
     WHERE o.solicitud_id = ? AND o.estado NOT IN ('RETIRADA','RECHAZADA','VENCIDA')`,
    [solicitudId]
  );

  const scored = rows.map((r) => {
    const score_precio = (100 / (Number(r.precio_total) + 1)) * 30;
    const score_reputacion = Number(r.promedio_calificacion ?? 3) * 10;
    const score_garantia = r.garantia_dias > 0 ? Math.min((r.garantia_dias / 30) * 5, 20) : 0;
    const score_rapidez = r.disponibilidad === 'INMEDIATA' ? 15 : r.disponibilidad === '1_DIA' ? 10 : 5;
    const score_compat = ['CONFIRMADA_VIN', 'CONFIRMADA_OEM'].includes(r.compatibilidad) ? 20
      : r.compatibilidad === 'POR_REVISAR' ? 5 : 0;
    // Historial de ventas: hasta 10pts, tope en 100 ventas
    const score_historial = Math.min((Number(r.total_ventas) || 0) / 10, 10);
    // Distancia: hasta 10pts si está a 0km, decrece 1pt cada 10km. Sin ubicación = neutral (5pts)
    const distancia_km = haversineKm(r.sol_lat, r.sol_lng, r.suc_lat, r.suc_lng);
    const score_distancia = distancia_km == null ? 5 : Math.max(0, 10 - distancia_km / 10);

    const score_total = score_precio + score_reputacion + score_garantia + score_rapidez
      + score_compat + score_historial + score_distancia;

    return {
      id: r.id,
      score_precio: round1(score_precio),
      score_reputacion: round1(score_reputacion),
      score_garantia: round1(score_garantia),
      score_rapidez: round1(score_rapidez),
      score_compat: round1(score_compat),
      score_historial: round1(score_historial),
      score_distancia: round1(score_distancia),
      distancia_km: distancia_km == null ? null : round1(distancia_km),
      score_total: round1(score_total),
    };
  });

  scored.sort((a, b) => b.score_total - a.score_total);
  return scored;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
