import { z } from 'zod';

export const registerSchema = z.object({
  nombre:   z.string().min(2).max(80).trim(),
  apellido: z.string().min(2).max(80).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  tipo:     z.enum(['CLIENTE','MECANICO','TALLER','EMPRESA']).optional(),
});

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const resetRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(10),
  newPassword: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
});

export const updateProfileSchema = z.object({
  nombre:    z.string().min(2).max(80).trim().optional(),
  apellido:  z.string().min(2).max(80).trim().optional(),
  telefono:  z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
});
