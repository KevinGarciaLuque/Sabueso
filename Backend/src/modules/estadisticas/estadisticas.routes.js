import { Router } from 'express';
import { authenticate, authorize, requireTenant, tenantScope } from '../../middlewares/auth.js';
import { ok } from '../../utils/response.js';
import { STORE_ROLES } from '../../constants/roles.js';
import db from '../../config/db.js';

const router = Router();

router.get('/tienda', authenticate, requireTenant, tenantScope, authorize(...STORE_ROLES), async (req, res, next) => {
  try {
    const tid = req.tenantId;

    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM ofertas WHERE tenant_id = ?)                          AS total_ofertas,
        (SELECT COUNT(*) FROM ofertas WHERE tenant_id = ? AND estado = 'ACEPTADA')  AS ofertas_aceptadas,
        (SELECT COUNT(*) FROM ordenes WHERE tenant_id = ?)                           AS total_ordenes,
        (SELECT COUNT(*) FROM ordenes WHERE tenant_id = ? AND estado = 'ENTREGADA') AS ordenes_entregadas,
        (SELECT ROUND(AVG(promedio), 2) FROM calificaciones WHERE tenant_id = ?)    AS promedio_calif,
        (SELECT COUNT(*) FROM calificaciones WHERE tenant_id = ?)                   AS total_calif,
        (SELECT COUNT(*) FROM ordenes WHERE tenant_id = ? AND estado = 'CANCELADA') AS ordenes_canceladas
    `, [tid, tid, tid, tid, tid, tid, tid]);

    stats.tasa_conversion = stats.total_ofertas > 0
      ? Math.round((Number(stats.ofertas_aceptadas) / Number(stats.total_ofertas)) * 100)
      : 0;

    // Últimas 8 semanas
    const [semanal] = await db.query(`
      SELECT
        DATE_FORMAT(MIN(creado_en), '%d/%m') AS semana_label,
        YEARWEEK(creado_en, 1)               AS semana,
        COUNT(*)                             AS ofertas,
        SUM(CASE WHEN estado = 'ACEPTADA' THEN 1 ELSE 0 END) AS aceptadas
      FROM ofertas
      WHERE tenant_id = ? AND creado_en >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      GROUP BY semana ORDER BY semana
    `, [tid]);

    // Top categorías de solicitudes atendidas
    const [categorias] = await db.query(`
      SELECT COALESCE(cr.nombre, 'Sin categoría') AS nombre, COUNT(*) AS total
      FROM ofertas of2
      JOIN solicitudes s ON s.id = of2.solicitud_id
      LEFT JOIN categorias_repuestos cr ON cr.id = s.categoria_id
      WHERE of2.tenant_id = ?
      GROUP BY cr.nombre ORDER BY total DESC LIMIT 6
    `, [tid]);

    // Suscripción activa
    const [[suscripcion]] = await db.query(`
      SELECT ts.estado, ts.fecha_inicio, ts.fecha_fin, p.nombre AS plan_nombre, p.codigo AS plan_codigo,
             DATEDIFF(ts.fecha_fin, CURDATE()) AS dias_restantes
      FROM tenant_suscripciones ts
      JOIN planes p ON p.id = ts.plan_id
      WHERE ts.tenant_id = ? AND ts.estado IN ('ACTIVA','PRUEBA')
      ORDER BY ts.creado_en DESC LIMIT 1
    `, [tid]);

    ok(res, { stats, semanal, categorias, suscripcion: suscripcion || null });
  } catch (err) { next(err); }
});

export default router;
