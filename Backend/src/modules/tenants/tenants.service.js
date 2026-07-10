import { randomBytes } from 'crypto';
import argon2 from 'argon2';
import * as repo from './tenants.repository.js';
import * as userRepo from '../auth/auth.repository.js';
import db from '../../config/db.js';

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export async function registrarTienda({
  nombreComercial, razonSocial, rtn, telefono, email, ciudad, departamento, descripcion,
  propietarioNombre, propietarioApellido, propietarioEmail, propietarioPassword,
}) {
  const existeTenant = await repo.findByEmail(email);
  if (existeTenant) {
    const err = new Error('Ya existe una tienda con ese email');
    err.status = 409;
    throw err;
  }

  const existeUsuario = await userRepo.findByEmail(propietarioEmail);
  if (existeUsuario) {
    const err = new Error('El email del propietario ya está en uso');
    err.status = 409;
    throw err;
  }

  let slug = slugify(nombreComercial);
  const existe = await repo.findBySlug(slug);
  if (existe) slug = `${slug}-${randomBytes(3).toString('hex')}`;

  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [tenantResult] = await conn.query(
      `INSERT INTO tenants (nombre_comercial, razon_social, rtn, slug, telefono, email, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombreComercial, razonSocial || null, rtn || null, slug, telefono || null, email, descripcion || null]
    );
    const tenantId = tenantResult.insertId;

    // Plan básico de prueba 14 días
    const [planRows] = await conn.query("SELECT id FROM planes WHERE codigo = 'BASICO' LIMIT 1");
    const planId = planRows[0]?.id || 1;
    const fechaFin = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await conn.query(
      `INSERT INTO tenant_suscripciones (tenant_id, plan_id, estado, fecha_inicio, fecha_fin)
       VALUES (?, ?, 'PRUEBA', CURDATE(), ?)`,
      [tenantId, planId, fechaFin.toISOString().slice(0, 10)]
    );

    await conn.query('INSERT IGNORE INTO tienda_insignias (tenant_id) VALUES (?)', [tenantId]);

    await conn.query(
      `INSERT INTO sucursales (tenant_id, nombre, ciudad, departamento, telefono, email, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [tenantId, nombreComercial, ciudad || null, departamento || null, telefono || null, email]
    );

    const passwordHash = await argon2.hash(propietarioPassword);
    const tokenVerif = randomBytes(32).toString('hex');
    await conn.query(
      `INSERT INTO usuarios (tenant_id, nombre, apellido, email, password_hash, tipo, token_verificacion)
       VALUES (?, ?, ?, ?, ?, 'PROPIETARIO', ?)`,
      [tenantId, propietarioNombre, propietarioApellido, propietarioEmail, passwordHash, tokenVerif]
    );

    await conn.commit();
    return { tenantId, slug };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listarTiendas({ limit, offset, estado, busqueda }) {
  return repo.findAll({ limit, offset, estado, busqueda });
}

export async function obtenerTienda(id) {
  const tienda = await repo.findById(id);
  if (!tienda) {
    const err = new Error('Tienda no encontrada');
    err.status = 404;
    throw err;
  }
  return tienda;
}

export async function cambiarEstado(id, estado) {
  const tienda = await repo.findById(id);
  if (!tienda) {
    const err = new Error('Tienda no encontrada');
    err.status = 404;
    throw err;
  }
  await repo.updateEstado(id, estado);
}

export async function actualizarTienda(id, tenantIdSesion, campos) {
  if (id !== tenantIdSesion) {
    const err = new Error('No puedes editar otra tienda');
    err.status = 403;
    throw err;
  }
  await repo.update(id, campos);
  return repo.findById(id);
}
