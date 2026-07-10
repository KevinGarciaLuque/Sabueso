import cron from 'node-cron';
import db from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Expire published requests past their fecha_limite.
 * Runs every 30 minutes.
 */
export function startExpireRequests() {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const [result] = await db.query(
        `UPDATE solicitudes
         SET estado = 'EXPIRADA'
         WHERE estado IN ('PUBLICADA','RECIBIENDO_OFERTAS')
           AND fecha_limite IS NOT NULL
           AND fecha_limite < NOW()`
      );
      if (result.affectedRows > 0) {
        logger.info({ count: result.affectedRows }, 'Solicitudes expiradas');
      }
    } catch (err) {
      logger.error(err, 'Error en job expireRequests');
    }
  });
}

/**
 * Expire offers past their vence_en date.
 * Runs every 30 minutes.
 */
export function startExpireOffers() {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const [result] = await db.query(
        `UPDATE ofertas
         SET estado = 'VENCIDA'
         WHERE estado = 'ENVIADA'
           AND vence_en IS NOT NULL
           AND vence_en < NOW()`
      );
      if (result.affectedRows > 0) {
        logger.info({ count: result.affectedRows }, 'Ofertas vencidas');
      }
    } catch (err) {
      logger.error(err, 'Error en job expireOffers');
    }
  });
}

/**
 * Mark subscriptions as VENCIDA when past their fecha_fin.
 * Runs daily at 1:00 AM.
 */
export function startExpireMemberships() {
  cron.schedule('0 1 * * *', async () => {
    try {
      const [result] = await db.query(
        `UPDATE tenant_suscripciones
         SET estado = 'VENCIDA'
         WHERE estado = 'ACTIVA'
           AND fecha_fin IS NOT NULL
           AND fecha_fin < CURDATE()`
      );
      if (result.affectedRows > 0) {
        logger.info({ count: result.affectedRows }, 'Membresías vencidas');
      }
    } catch (err) {
      logger.error(err, 'Error en job expireMemberships');
    }
  });
}

/**
 * Send membership expiry alerts 7 days before expiration.
 * Runs daily at 9:00 AM.
 */
export function startMembershipAlerts() {
  cron.schedule('0 9 * * *', async () => {
    try {
      const [rows] = await db.query(
        `SELECT ts.id, ts.tenant_id, ts.fecha_fin,
                t.nombre_comercial,
                u.id AS usuario_id, u.email, u.nombre
         FROM tenant_suscripciones ts
         JOIN tenants t ON t.id = ts.tenant_id
         JOIN usuarios u ON u.tenant_id = t.id AND u.tipo = 'PROPIETARIO' AND u.activo = 1
         WHERE ts.estado = 'ACTIVA'
           AND ts.fecha_fin IS NOT NULL
           AND DATEDIFF(ts.fecha_fin, CURDATE()) = 7`
      );

      for (const row of rows) {
        await db.query(
          `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, url_accion)
           VALUES (?, 'MEMBRESIA_POR_VENCER', ?, ?, '/tienda/membresia')`,
          [
            row.usuario_id,
            'Tu membresía vence pronto',
            `Tu plan de ${row.nombre_comercial} vence el ${new Date(row.fecha_fin).toLocaleDateString('es-HN')}. Renueva para no perder el servicio.`,
          ]
        );
      }

      if (rows.length > 0) {
        logger.info({ count: rows.length }, 'Alertas de membresía enviadas');
      }
    } catch (err) {
      logger.error(err, 'Error en job membershipAlerts');
    }
  });
}

export function initJobs() {
  startExpireRequests();
  startExpireOffers();
  startExpireMemberships();
  startMembershipAlerts();
  logger.info('Jobs programados iniciados');
}
