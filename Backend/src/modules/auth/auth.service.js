import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import * as repo from './auth.repository.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../notifications/mail.service.js';

function generateTokens(user) {
  const payload = {
    sub:      user.id,
    email:    user.email,
    tipo:     user.tipo,
    tenantId: user.tenant_id || null,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
  return { accessToken, refreshToken };
}

export async function register({ nombre, apellido, email, password, tipo = 'CLIENTE' }) {
  const existe = await repo.findByEmail(email);
  if (existe) {
    const err = new Error('El email ya está registrado');
    err.status = 409;
    throw err;
  }

  const passwordHash = await argon2.hash(password);
  const tokenVerificacion = randomBytes(32).toString('hex');

  const userId = await repo.createUser({
    nombre, apellido, email, passwordHash, tipo, tokenVerificacion,
  });

  await sendVerificationEmail(email, nombre, tokenVerificacion);

  return { id: userId, email, nombre };
}

export async function login({ email, password, ip, userAgent }) {
  const failedAttempts = await repo.countRecentFailedAttempts(email);
  if (failedAttempts >= 10) {
    const err = new Error('Cuenta bloqueada temporalmente por múltiples intentos fallidos');
    err.status = 429;
    throw err;
  }

  const user = await repo.findByEmail(email);
  if (!user) {
    await repo.logAccess(email, ip, userAgent, false);
    const err = new Error('Credenciales incorrectas');
    err.status = 401;
    throw err;
  }

  const passwordOk = await argon2.verify(user.password_hash, password);
  if (!passwordOk) {
    await repo.logAccess(email, ip, userAgent, false);
    const err = new Error('Credenciales incorrectas');
    err.status = 401;
    throw err;
  }

  if (!user.activo) {
    const err = new Error('Cuenta desactivada');
    err.status = 403;
    throw err;
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await repo.updateRefreshToken(user.id, refreshToken);
  await repo.logAccess(email, ip, userAgent, true);

  return {
    accessToken,
    refreshToken,
    user: {
      id:        user.id,
      nombre:    user.nombre,
      apellido:  user.apellido,
      email:     user.email,
      tipo:      user.tipo,
      tenantId:  user.tenant_id,
      emailVerificado: !!user.email_verificado,
      avatarUrl: user.avatar_url,
    },
  };
}

export async function refreshAccessToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Refresh token inválido');
    err.status = 401;
    throw err;
  }

  const user = await repo.findByRefreshToken(token);
  if (!user || user.id !== payload.sub) {
    const err = new Error('Refresh token no válido');
    err.status = 401;
    throw err;
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  await repo.updateRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId) {
  await repo.clearRefreshToken(userId);
}

export async function verifyEmail(token) {
  const ok = await repo.verifyEmail(token);
  if (!ok) {
    const err = new Error('Token de verificación inválido o ya usado');
    err.status = 400;
    throw err;
  }
}

export async function requestPasswordReset(email) {
  const user = await repo.findByEmail(email);
  if (!user) return; // silencioso para no revelar emails

  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await repo.setResetToken(email, token, expira);
  await sendPasswordResetEmail(email, user.nombre, token);
}

export async function resetPassword({ token, newPassword }) {
  const user = await repo.findByResetToken(token);
  if (!user) {
    const err = new Error('Token inválido o expirado');
    err.status = 400;
    throw err;
  }

  const passwordHash = await argon2.hash(newPassword);
  await repo.updatePassword(user.id, passwordHash);
  await repo.clearRefreshToken(user.id);
}

export async function getMe(userId) {
  const user = await repo.findById(userId);
  if (!user) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  return user;
}

export async function updateProfile(userId, { nombre, apellido, telefono, avatarUrl }) {
  const sets = [];
  const vals = [];
  if (nombre    !== undefined) { sets.push('nombre = ?');     vals.push(nombre); }
  if (apellido  !== undefined) { sets.push('apellido = ?');   vals.push(apellido); }
  if (telefono  !== undefined) { sets.push('telefono = ?');   vals.push(telefono); }
  if (avatarUrl !== undefined) { sets.push('avatar_url = ?'); vals.push(avatarUrl); }
  if (!sets.length) return;
  vals.push(userId);
  await repo.updateUserFields(userId, sets, vals);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await repo.findPasswordHash(userId);
  if (!user) { const e = new Error('Usuario no encontrado'); e.status = 404; throw e; }

  const valid = await argon2.verify(user.password_hash, currentPassword);
  if (!valid) { const e = new Error('Contraseña actual incorrecta'); e.status = 400; throw e; }

  const newHash = await argon2.hash(newPassword);
  await repo.updatePassword(userId, newHash);
}
