import db from '../config/db.js';
import { logger } from './logger.js';

export async function audit(req, accion, tabla = null, registroId = null, datosDespues = null) {
  try {
    await db.query(
      `INSERT INTO auditoria (usuario_id, tenant_id, accion, tabla, registro_id, datos_despues, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.sub     ?? null,
        req.user?.tenantId ?? null,
        accion,
        tabla,
        registroId ? String(registroId) : null,
        datosDespues ? JSON.stringify(datosDespues) : null,
        req.ip ?? null,
        req.get?.('user-agent') ?? null,
      ]
    );
  } catch (err) {
    logger.warn({ err }, 'Error registrando auditoría');
  }
}
