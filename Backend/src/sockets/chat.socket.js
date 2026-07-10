import jwt from 'jsonwebtoken';
import * as chatRepo from '../modules/chat/chat.repository.js';
import { logger } from '../utils/logger.js';
import { CLIENT_ROLES } from '../constants/roles.js';

export function initChatSocket(io) {
  // Middleware: autenticar socket con JWT en handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('No autorizado'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ userId: socket.user.sub }, 'Socket conectado');

    // Salas personales para notificaciones globales (badge del sidebar)
    socket.join(`user:${socket.user.sub}`);
    if (socket.user.tenantId) socket.join(`tenant:${socket.user.tenantId}`);

    // Unirse a sala de conversación
    socket.on('join:conversation', async ({ conversacionId }) => {
      const conv = await chatRepo.findConversacionById(conversacionId);
      if (!conv) return;

      const esTienda = conv.tenant_id === socket.user.tenantId;
      const esCliente = conv.cliente_id === socket.user.sub;
      if (!esTienda && !esCliente) return;

      socket.join(`conv:${conversacionId}`);
      logger.debug({ userId: socket.user.sub, conversacionId }, 'Joined conversation room');
    });

    // Enviar mensaje
    socket.on('message:send', async ({ conversacionId, contenido, tipo = 'TEXTO', archivoUrl }, ack) => {
      try {
        const conv = await chatRepo.findConversacionById(conversacionId);
        if (!conv) return ack?.({ error: 'Conversación no encontrada' });

        const esTienda  = conv.tenant_id === socket.user.tenantId;
        const esCliente = conv.cliente_id === socket.user.sub;
        if (!esTienda && !esCliente) return ack?.({ error: 'No autorizado' });

        const emisorEsCliente = CLIENT_ROLES.includes(socket.user.tipo);

        const mensaje = await chatRepo.saveMensaje({
          conversacionId,
          emisorId: socket.user.sub,
          tipo,
          contenido,
          archivoUrl,
          emisorEsCliente,
        });

        io.to(`conv:${conversacionId}`).emit('message:new', mensaje);

        // Notificar al receptor en su sala personal para actualizar el badge
        if (emisorEsCliente) {
          io.to(`tenant:${conv.tenant_id}`).emit('conversation:updated', {
            conversacionId, ultimoMensaje: mensaje.contenido,
          });
        } else {
          io.to(`user:${conv.cliente_id}`).emit('conversation:updated', {
            conversacionId, ultimoMensaje: mensaje.contenido,
          });
        }

        ack?.({ ok: true });
      } catch (err) {
        logger.error({ err }, 'Error al guardar mensaje');
        ack?.({ error: 'Error al enviar mensaje' });
        socket.emit('message:error', { message: 'Error al enviar mensaje' });
      }
    });

    // Indicador de escritura
    socket.on('typing:start', ({ conversacionId }) => {
      socket.to(`conv:${conversacionId}`).emit('typing:started', { userId: socket.user.sub });
    });

    socket.on('typing:stop', ({ conversacionId }) => {
      socket.to(`conv:${conversacionId}`).emit('typing:stopped', { userId: socket.user.sub });
    });

    // Marcar como leídos
    socket.on('messages:read', async ({ conversacionId }) => {
      const esCliente = CLIENT_ROLES.includes(socket.user.tipo);
      await chatRepo.marcarLeidos(conversacionId, esCliente);
      socket.to(`conv:${conversacionId}`).emit('messages:read', { conversacionId });
      // Actualizar el propio badge
      socket.emit('conversation:read', { conversacionId });
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: socket.user.sub }, 'Socket desconectado');
    });
  });
}
