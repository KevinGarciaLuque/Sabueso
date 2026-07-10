import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger.js';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

async function send({ to, subject, html }) {
  if (!process.env.MAIL_USER) {
    logger.debug({ to, subject }, 'Email simulado (sin MAIL_USER configurado)');
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from:    `"${process.env.APP_NAME}" <${process.env.MAIL_FROM}>`,
      to, subject, html,
    });
  } catch (err) {
    logger.error({ err, to, subject }, 'Error enviando email');
  }
}

export async function sendVerificationEmail(email, nombre, token) {
  const url = `${process.env.FRONTEND_URL}/verificar-email/${token}`;
  await send({
    to:      email,
    subject: 'Verifica tu cuenta en Sabueso',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Gracias por registrarte en <strong>Sabueso</strong>. Verifica tu cuenta haciendo clic en el botón:</p>
      <a href="${url}" style="background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
        Verificar mi cuenta
      </a>
      <p>Este enlace expira en 24 horas.</p>
      <p>Si no creaste esta cuenta, ignora este correo.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email, nombre, token) {
  const url = `${process.env.FRONTEND_URL}/restablecer-password/${token}`;
  await send({
    to:      email,
    subject: 'Restablece tu contraseña en Sabueso',
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <a href="${url}" style="background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
        Restablecer contraseña
      </a>
      <p>Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
    `,
  });
}

export async function sendOfertaEmail(email, nombre, solicitudNombre) {
  await send({
    to:      email,
    subject: `Nueva oferta para tu solicitud en Sabueso`,
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Una tienda ha enviado una oferta para tu solicitud de <strong>${solicitudNombre}</strong>.</p>
      <a href="${process.env.FRONTEND_URL}/mis-solicitudes"
         style="background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
        Ver oferta
      </a>
    `,
  });
}

export async function sendNuevaSolicitudEmail(email, nombre, repuesto) {
  await send({
    to:      email,
    subject: `Nueva solicitud compatible: ${repuesto}`,
    html: `
      <h2>Hola ${nombre},</h2>
      <p>Un cliente está buscando <strong>${repuesto}</strong> y puede ser compatible con tu inventario.</p>
      <a href="${process.env.FRONTEND_URL}/tienda/solicitudes"
         style="background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
        Ver solicitud
      </a>
    `,
  });
}
