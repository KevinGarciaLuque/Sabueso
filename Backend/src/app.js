import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import { testConnection } from './config/db.js';
import { initChatSocket } from './sockets/chat.socket.js';
import { initJobs } from './jobs/scheduler.js';

// Rutas
import authRoutes          from './modules/auth/auth.routes.js';
import tenantsRoutes       from './modules/tenants/tenants.routes.js';
import usersRoutes         from './modules/users/users.routes.js';
import vehiclesRoutes      from './modules/vehicles/vehicles.routes.js';
import requestsRoutes      from './modules/requests/requests.routes.js';
import offersRoutes        from './modules/offers/offers.routes.js';
import chatRoutes          from './modules/chat/chat.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import catalogRoutes       from './modules/catalog/catalog.routes.js';
import uploadsRoutes       from './modules/uploads/uploads.routes.js';
import ordenesRoutes       from './modules/ordenes/ordenes.routes.js';
import califRoutes         from './modules/calificaciones/calificaciones.routes.js';
import estadisticasRoutes  from './modules/estadisticas/estadisticas.routes.js';
import adminRoutes         from './modules/admin/admin.routes.js';
import inventoryRoutes     from './modules/inventory/inventory.routes.js';
import disputesRoutes      from './modules/disputes/disputes.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

const io = new SocketIO(httpServer, {
  cors: {
    origin:      process.env.FRONTEND_URL,
    credentials: true,
  },
});

initChatSocket(io);

// Compartir io en req para usarlo en controllers
app.set('io', io);

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middlewares globales
app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(apiLimiter);

// Rutas API
app.use('/api/auth',           authRoutes);
app.use('/api/tiendas',        tenantsRoutes);
app.use('/api/usuarios',       usersRoutes);
app.use('/api/vehiculos',      vehiclesRoutes);
app.use('/api/solicitudes',    requestsRoutes);
app.use('/api/ofertas',        offersRoutes);
app.use('/api/chat',           chatRoutes);
app.use('/api/notificaciones', notificationsRoutes);
app.use('/api/catalogo',       catalogRoutes);
app.use('/api/uploads',        uploadsRoutes);
app.use('/api/ordenes',        ordenesRoutes);
app.use('/api/calificaciones', califRoutes);
app.use('/api/estadisticas',   estadisticasRoutes);
app.use('/api/inventario',     inventoryRoutes);
app.use('/api',                disputesRoutes);
app.use('/api',                adminRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'Sabueso API', ts: new Date() }));

// 404 y error handler
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  await testConnection();
  initJobs();
  httpServer.listen(PORT, () => {
    logger.info(`Sabueso API corriendo en http://localhost:${PORT}`);
  });
}

start().catch(err => {
  logger.error(err, 'Error al iniciar el servidor');
  process.exit(1);
});

export { io };
