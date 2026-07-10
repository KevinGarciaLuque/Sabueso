import * as service from './auth.service.js';
import * as v from './auth.validators.js';
import { ok, created, badRequest, serverError } from '../../utils/response.js';

export async function register(req, res, next) {
  try {
    const data = v.registerSchema.parse(req.body);
    const result = await service.register(data);
    created(res, result, 'Registro exitoso. Revisa tu correo para verificar tu cuenta.');
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const data = v.loginSchema.parse(req.body);
    const result = await service.login({
      ...data,
      ip:        req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    ok(res, { accessToken: result.accessToken, user: result.user }, 'Bienvenido');
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Refresh token no encontrado' });
    }
    const result = await service.refreshAccessToken(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    ok(res, { accessToken: result.accessToken }, 'Token renovado');
  } catch (err) { next(err); }
}

export async function logout(req, res, next) {
  try {
    await service.logout(req.user.sub);
    res.clearCookie('refreshToken', { path: '/' });
    ok(res, {}, 'Sesión cerrada');
  } catch (err) { next(err); }
}

export async function verifyEmail(req, res, next) {
  try {
    await service.verifyEmail(req.params.token);
    ok(res, {}, 'Email verificado exitosamente');
  } catch (err) { next(err); }
}

export async function requestReset(req, res, next) {
  try {
    const { email } = v.resetRequestSchema.parse(req.body);
    await service.requestPasswordReset(email);
    ok(res, {}, 'Si el email existe recibirás instrucciones para restablecer tu contraseña.');
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const data = v.resetPasswordSchema.parse(req.body);
    await service.resetPassword(data);
    ok(res, {}, 'Contraseña restablecida exitosamente');
  } catch (err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const user = await service.getMe(req.user.sub);
    ok(res, user);
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const data = v.updateProfileSchema.parse(req.body);
    await service.updateProfile(req.user.sub, data);
    ok(res, {}, 'Perfil actualizado');
  } catch (err) { next(err); }
}

export async function changePassword(req, res, next) {
  try {
    const data = v.changePasswordSchema.parse(req.body);
    await service.changePassword(req.user.sub, data);
    ok(res, {}, 'Contraseña actualizada');
  } catch (err) { next(err); }
}
