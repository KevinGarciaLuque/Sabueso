import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import * as service from './tenants.service.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { ok, created, notFound, forbidden, badRequest } from '../../utils/response.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { ROLES } from '../../constants/roles.js';
import { audit } from '../../utils/audit.js';
import db from '../../config/db.js';

const router = Router();

const registroSchema = z.object({
  nombreComercial:      z.string().min(2).max(150).trim(),
  razonSocial:          z.string().max(200).optional(),
  rtn:                  z.string().max(20).optional(),
  telefono:             z.string().max(20).optional(),
  email:                z.string().email().toLowerCase().trim(),
  ciudad:               z.string().max(100).optional(),
  departamento:         z.string().max(100).optional(),
  descripcion:          z.string().max(1000).optional(),
  propietarioNombre:    z.string().min(2).max(80).trim(),
  propietarioApellido:  z.string().min(2).max(80).trim(),
  propietarioEmail:     z.string().email().toLowerCase().trim(),
  propietarioPassword:  z.string().min(8)
    .regex(/[A-Z]/).regex(/[0-9]/),
});

// Registro público de tienda nueva
router.post('/register', async (req, res, next) => {
  try {
    const data = registroSchema.parse(req.body);
    const result = await service.registrarTienda(data);
    created(res, result, 'Tienda registrada. Pendiente de aprobación.');
  } catch (err) { next(err); }
});

// Ver perfil de tienda propia
router.get('/me', authenticate, authorize(...[ROLES.PROPIETARIO, ROLES.ADMINISTRADOR]), async (req, res, next) => {
  try {
    const tienda = await service.obtenerTienda(req.user.tenantId);
    ok(res, tienda);
  } catch (err) { next(err); }
});

// Actualizar tienda propia
router.patch('/me', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const tienda = await service.actualizarTienda(req.user.tenantId, req.user.tenantId, req.body);
    ok(res, tienda, 'Tienda actualizada');
  } catch (err) { next(err); }
});

// ── Gestión de usuarios de la tienda ──────────────────────────

// Listar usuarios del mismo tenant
router.get('/me/usuarios', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, apellido, email, tipo, activo, ultimo_acceso, creado_en
       FROM usuarios WHERE tenant_id = ? ORDER BY creado_en`,
      [req.user.tenantId]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

const nuevoUsuarioSchema = z.object({
  nombre:   z.string().min(2).max(80).trim(),
  apellido: z.string().min(2).max(80).trim(),
  email:    z.string().email().toLowerCase().trim(),
  tipo:     z.enum(['ADMINISTRADOR','VENDEDOR','BODEGA','CAJERO','REPARTIDOR']),
});

// Crear usuario de la tienda (con contraseña temporal)
router.post('/me/usuarios', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const data = nuevoUsuarioSchema.parse(req.body);
    const [[existing]] = await db.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [data.email]);
    if (existing) return badRequest(res, 'El email ya está en uso');

    // Temp password: TiendaXXXX (user must change on first login — TODO)
    const tempPass = `Tienda${randomBytes(3).toString('hex').toUpperCase()}`;
    const hash = await argon2.hash(tempPass);

    const [r] = await db.query(
      `INSERT INTO usuarios (tenant_id, nombre, apellido, email, password_hash, tipo, email_verificado)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [req.user.tenantId, data.nombre, data.apellido, data.email, hash, data.tipo]
    );

    created(res, { id: r.insertId, passwordTemporal: tempPass },
      'Usuario creado. Comparte la contraseña temporal con el colaborador.');
  } catch (err) { next(err); }
});

// Activar / desactivar usuario
router.patch('/me/usuarios/:id/activo', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const uid = Number(req.params.id);
    // Verify user belongs to same tenant
    const [[u]] = await db.query(
      'SELECT id, tipo FROM usuarios WHERE id = ? AND tenant_id = ? LIMIT 1',
      [uid, req.user.tenantId]
    );
    if (!u) return notFound(res, 'Usuario no encontrado');
    if (u.tipo === 'PROPIETARIO') return forbidden(res, 'No puedes desactivar al propietario');
    if (uid === req.user.sub) return badRequest(res, 'No puedes desactivarte a ti mismo');

    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
    await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, uid]);
    ok(res, {}, activo ? 'Usuario activado' : 'Usuario desactivado');
  } catch (err) { next(err); }
});

// ── Admin: control de membresías ──────────────────────────────

// Listar todas las suscripciones
router.get('/membresias', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE, ROLES.ADMIN_COMERCIAL), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const estado = req.query.estado;
    const conds  = [];
    const params = [];
    if (estado) { conds.push('ts.estado = ?'); params.push(estado); }
    const where = conds.length ? `AND ${conds.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT t.id AS tenant_id, t.nombre_comercial, t.estado AS tienda_estado,
              ts.id, ts.estado, ts.fecha_inicio, ts.fecha_fin,
              DATEDIFF(ts.fecha_fin, CURDATE()) AS dias_restantes,
              p.nombre AS plan_nombre, p.codigo AS plan_codigo, p.precio
       FROM tenant_suscripciones ts
       JOIN tenants t ON t.id = ts.tenant_id
       JOIN planes  p ON p.id = ts.plan_id
       WHERE 1=1 ${where}
       ORDER BY ts.fecha_fin ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tenant_suscripciones ts WHERE 1=1 ${where}`, params
    );
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

const membresiaSchema = z.object({
  planId:    z.number().int().positive().optional(),
  estado:    z.enum(['ACTIVA','VENCIDA','CANCELADA','PRUEBA']).optional(),
  fechaFin:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Actualizar membresía de una tienda
router.patch('/:id/membresia', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE, ROLES.ADMIN_COMERCIAL), async (req, res, next) => {
  try {
    const tenantId = Number(req.params.id);
    const data = membresiaSchema.parse(req.body);

    const [[actual]] = await db.query(
      `SELECT ts.id FROM tenant_suscripciones ts
       WHERE ts.tenant_id = ? ORDER BY ts.creado_en DESC LIMIT 1`,
      [tenantId]
    );

    if (actual) {
      const sets = [];
      const vals = [];
      if (data.estado)  { sets.push('estado = ?');     vals.push(data.estado); }
      if (data.fechaFin){ sets.push('fecha_fin = ?');  vals.push(data.fechaFin); }
      if (data.planId)  { sets.push('plan_id = ?');    vals.push(data.planId); }
      if (sets.length) {
        vals.push(actual.id);
        await db.query(`UPDATE tenant_suscripciones SET ${sets.join(', ')} WHERE id = ?`, vals);
      }
    } else {
      // Create new subscription
      if (!data.planId) return badRequest(res, 'Se requiere planId para crear suscripción');
      await db.query(
        `INSERT INTO tenant_suscripciones (tenant_id, plan_id, estado, fecha_inicio, fecha_fin)
         VALUES (?, ?, ?, CURDATE(), ?)`,
        [tenantId, data.planId, data.estado || 'ACTIVA', data.fechaFin || null]
      );
    }
    audit(req, 'MEMBRESIA_ACTUALIZADA', 'tenant_suscripciones', tenantId, data);
    ok(res, {}, 'Membresía actualizada');
  } catch (err) { next(err); }
});

// --- Admin ---
router.get('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE, ROLES.ADMIN_COMERCIAL), async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const { rows, total } = await service.listarTiendas({
      limit, offset,
      estado:   req.query.estado,
      busqueda: req.query.q,
    });
    paginatedResponse(res, { data: rows, total, page, limit });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE), async (req, res, next) => {
  try {
    const tienda = await service.obtenerTienda(Number(req.params.id));
    ok(res, tienda);
  } catch (err) { next(err); }
});

// Sucursales de una tienda (admin)
router.get('/:id/sucursales', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, ciudad, departamento, telefono, email, es_principal, activa FROM sucursales WHERE tenant_id = ? ORDER BY es_principal DESC',
      [Number(req.params.id)]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

// Usuarios de una tienda (admin)
router.get('/:id/usuarios', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, apellido, email, tipo, activo, creado_en FROM usuarios WHERE tenant_id = ? ORDER BY tipo',
      [Number(req.params.id)]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

router.patch('/:id/estado', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE), async (req, res, next) => {
  try {
    const { estado } = z.object({
      estado: z.enum(['PENDIENTE','EN_REVISION','VERIFICADA','RECHAZADA','SUSPENDIDA','BLOQUEADA']),
    }).parse(req.body);
    const tid = Number(req.params.id);
    await service.cambiarEstado(tid, estado);
    audit(req, `TIENDA_ESTADO:${estado}`, 'tenants', tid, { estado });
    ok(res, {}, 'Estado actualizado');
  } catch (err) { next(err); }
});

// ── Sucursales ────────────────────────────────────────────────

const sucursalSchema = z.object({
  nombre:       z.string().min(2).max(150).trim(),
  direccion:    z.string().max(300).optional().nullable(),
  ciudad:       z.string().max(100).optional().nullable(),
  departamento: z.string().max(100).optional().nullable(),
  telefono:     z.string().max(20).optional().nullable(),
  email:        z.string().email().optional().nullable(),
  latitud:      z.number().optional().nullable(),
  longitud:     z.number().optional().nullable(),
  horario:      z.record(z.any()).optional().nullable(),
  esPrincipal:  z.boolean().optional(),
});

// Listar sucursales de la tienda propia
router.get('/me/sucursales', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, direccion, ciudad, departamento, telefono, email,
              latitud, longitud, horario, es_principal, activa, creado_en
       FROM sucursales WHERE tenant_id = ? ORDER BY es_principal DESC, nombre`,
      [req.user.tenantId]
    );
    ok(res, rows);
  } catch (err) { next(err); }
});

// Crear sucursal
router.post('/me/sucursales', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const d = sucursalSchema.parse(req.body);
    if (d.esPrincipal) {
      await db.query('UPDATE sucursales SET es_principal = 0 WHERE tenant_id = ?', [req.user.tenantId]);
    }
    const [r] = await db.query(
      `INSERT INTO sucursales (tenant_id, nombre, direccion, ciudad, departamento,
                               telefono, email, latitud, longitud, horario, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, d.nombre, d.direccion ?? null, d.ciudad ?? null, d.departamento ?? null,
       d.telefono ?? null, d.email ?? null, d.latitud ?? null, d.longitud ?? null,
       d.horario ? JSON.stringify(d.horario) : null, d.esPrincipal ? 1 : 0]
    );
    audit(req, 'SUCURSAL_CREADA', 'sucursales', r.insertId, d);
    const [[suc]] = await db.query('SELECT * FROM sucursales WHERE id = ?', [r.insertId]);
    created(res, suc, 'Sucursal creada');
  } catch (err) { next(err); }
});

// Actualizar sucursal
router.patch('/me/sucursales/:id', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const sucId = Number(req.params.id);
    const [[suc]] = await db.query(
      'SELECT id FROM sucursales WHERE id = ? AND tenant_id = ? LIMIT 1',
      [sucId, req.user.tenantId]
    );
    if (!suc) return notFound(res, 'Sucursal no encontrada');

    const d = sucursalSchema.partial().parse(req.body);
    if (d.esPrincipal) {
      await db.query('UPDATE sucursales SET es_principal = 0 WHERE tenant_id = ?', [req.user.tenantId]);
    }
    const sets = []; const vals = [];
    if (d.nombre       !== undefined) { sets.push('nombre = ?');       vals.push(d.nombre); }
    if (d.direccion    !== undefined) { sets.push('direccion = ?');    vals.push(d.direccion); }
    if (d.ciudad       !== undefined) { sets.push('ciudad = ?');       vals.push(d.ciudad); }
    if (d.departamento !== undefined) { sets.push('departamento = ?'); vals.push(d.departamento); }
    if (d.telefono     !== undefined) { sets.push('telefono = ?');     vals.push(d.telefono); }
    if (d.email        !== undefined) { sets.push('email = ?');        vals.push(d.email); }
    if (d.latitud      !== undefined) { sets.push('latitud = ?');      vals.push(d.latitud); }
    if (d.longitud     !== undefined) { sets.push('longitud = ?');     vals.push(d.longitud); }
    if (d.horario      !== undefined) { sets.push('horario = ?');      vals.push(JSON.stringify(d.horario)); }
    if (d.esPrincipal  !== undefined) { sets.push('es_principal = ?'); vals.push(d.esPrincipal ? 1 : 0); }

    if (sets.length) {
      vals.push(sucId);
      await db.query(`UPDATE sucursales SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
    audit(req, 'SUCURSAL_ACTUALIZADA', 'sucursales', sucId, d);
    ok(res, {}, 'Sucursal actualizada');
  } catch (err) { next(err); }
});

// Eliminar / desactivar sucursal
router.delete('/me/sucursales/:id', authenticate, authorize(ROLES.PROPIETARIO, ROLES.ADMINISTRADOR), async (req, res, next) => {
  try {
    const sucId = Number(req.params.id);
    const [[suc]] = await db.query(
      'SELECT id, es_principal FROM sucursales WHERE id = ? AND tenant_id = ? LIMIT 1',
      [sucId, req.user.tenantId]
    );
    if (!suc) return notFound(res, 'Sucursal no encontrada');
    if (suc.es_principal) return badRequest(res, 'No puedes eliminar la sucursal principal');
    await db.query('UPDATE sucursales SET activa = 0 WHERE id = ?', [sucId]);
    audit(req, 'SUCURSAL_DESACTIVADA', 'sucursales', sucId, {});
    ok(res, {}, 'Sucursal desactivada');
  } catch (err) { next(err); }
});

export default router;
