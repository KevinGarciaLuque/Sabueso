import db from '../../config/db.js';
import * as notifRepo from '../notifications/notifications.repository.js';

/**
 * When a solicitud is published, score active stores and notify those
 * with some compatibility with the request's brand/category/city.
 */
export async function notificarTiendasCompatibles(solicitudId) {
  // Get full solicitud details including vehicle brand and category
  const [[sol]] = await db.query(
    `SELECT s.id, s.nombre_repuesto, s.ciudad, s.urgencia,
            s.categoria_id, s.descripcion,
            v.marca_id, v.modelo_id, v.anio,
            m.nombre  AS marca_nombre,
            mo.nombre AS modelo_nombre,
            cr.nombre AS categoria_nombre
     FROM solicitudes s
     LEFT JOIN vehiculos v  ON v.id  = s.vehiculo_id
     LEFT JOIN marcas m     ON m.id  = v.marca_id
     LEFT JOIN modelos mo   ON mo.id = v.modelo_id
     LEFT JOIN categorias_repuestos cr ON cr.id = s.categoria_id
     WHERE s.id = ?`,
    [solicitudId]
  );
  if (!sol) return 0;

  const marcaId     = sol.marca_id     || 0;
  const categoriaId = sol.categoria_id || 0;
  const ciudad      = (sol.ciudad || '').toLowerCase();

  // Find active store users (PROPIETARIO / ADMINISTRADOR) with active subscription
  // Score based on historical offers in same category/brand/city
  const [tiendas] = await db.query(
    `SELECT
        u.id   AS usuario_id,
        t.id   AS tenant_id,
        t.nombre_comercial,
        (
          /* Category match: offered before in same category */
          CASE WHEN ? > 0 AND EXISTS (
            SELECT 1 FROM ofertas of2
            JOIN solicitudes s2 ON s2.id = of2.solicitud_id
            WHERE of2.tenant_id = t.id AND s2.categoria_id = ? LIMIT 1
          ) THEN 30 ELSE 0 END
          +
          /* Brand match: offered before for same brand */
          CASE WHEN ? > 0 AND EXISTS (
            SELECT 1 FROM ofertas of3
            JOIN solicitudes s3 ON s3.id = of3.solicitud_id
            JOIN vehiculos v3   ON v3.id  = s3.vehiculo_id
            WHERE of3.tenant_id = t.id AND v3.marca_id = ? LIMIT 1
          ) THEN 20 ELSE 0 END
          +

          /* Plan priority bonus */
          CASE WHEN p.prioridad_solicitudes = 1 THEN 15 ELSE 0 END
        ) AS score
     FROM tenants t
     JOIN tenant_suscripciones ts ON ts.tenant_id = t.id
          AND ts.estado IN ('ACTIVA','PRUEBA')
          AND (ts.fecha_fin IS NULL OR ts.fecha_fin >= CURDATE())
     JOIN planes p ON p.id = ts.plan_id
     JOIN usuarios u ON u.tenant_id = t.id
          AND u.tipo IN ('PROPIETARIO','ADMINISTRADOR')
          AND u.activo = 1
     WHERE t.estado IN ('VERIFICADA','PENDIENTE')
     GROUP BY u.id, t.id
     ORDER BY score DESC
     LIMIT 200`,
    [categoriaId, categoriaId, marcaId, marcaId]
  );

  if (!tiendas.length) return 0;

  const urgente = ['CRITICA', 'ALTA'].includes(sol.urgencia);
  const titulo  = urgente
    ? `Solicitud urgente: ${sol.nombre_repuesto}`
    : `Nueva solicitud: ${sol.nombre_repuesto}`;

  const partes = [];
  if (sol.marca_nombre)    partes.push(sol.marca_nombre);
  if (sol.modelo_nombre)   partes.push(sol.modelo_nombre);
  if (sol.anio)            partes.push(String(sol.anio));
  if (sol.categoria_nombre)partes.push(`• ${sol.categoria_nombre}`);
  if (sol.ciudad)          partes.push(`• ${sol.ciudad}`);
  const cuerpo = partes.join(' ');

  // Notify each store user (avoid duplicates per tenant)
  const notificados = new Set();
  for (const t of tiendas) {
    if (notificados.has(t.tenant_id)) continue;
    notificados.add(t.tenant_id);

    await notifRepo.create({
      usuarioId: t.usuario_id,
      tipo:      'NUEVA_SOLICITUD_COMPATIBLE',
      titulo,
      cuerpo,
      urlAccion: `/tienda/solicitudes/${solicitudId}`,
      datos:     { solicitudId, score: t.score },
    });
  }

  return notificados.size;
}
