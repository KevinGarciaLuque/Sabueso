import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../../components/ui/Spinner';
import { User, Phone, Lock } from 'lucide-react';

const profileSchema = z.object({
  nombre:   z.string().min(2, 'MÃ­nimo 2 caracteres').max(80).trim(),
  apellido: z.string().min(2, 'MÃ­nimo 2 caracteres').max(80).trim(),
  telefono: z.string().max(20).optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseÃ±a actual'),
  newPassword: z.string().min(8, 'MÃ­nimo 8 caracteres')
    .regex(/[A-Z]/, 'Necesita al menos una mayÃºscula')
    .regex(/[0-9]/, 'Necesita al menos un nÃºmero'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, {
  message: 'Las contraseÃ±as no coinciden',
  path: ['confirm'],
});

export default function ClientProfile() {
  const { user, setAuth } = useAuthStore();

  const { register: regP, handleSubmit: hsP, formState: { errors: errP, isSubmitting: subP } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre:   user?.nombre   || '',
      apellido: user?.apellido || '',
      telefono: user?.telefono || '',
    },
  });

  const { register: regPw, handleSubmit: hsPw, reset: resetPw, formState: { errors: errPw, isSubmitting: subPw } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const updateProfile = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: (_, vars) => {
      toast.success('Perfil actualizado');
      setAuth({ ...user, nombre: vars.nombre ?? user.nombre, apellido: vars.apellido ?? user.apellido }, null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al actualizar'),
  });

  const changePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('ContraseÃ±a actualizada correctamente');
      resetPw();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al cambiar la contraseÃ±a'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>

      {/* InformaciÃ³n personal */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-semibold text-gray-800">InformaciÃ³n personal</h2>
        </div>

        <form onSubmit={hsP((d) => updateProfile.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input {...regP('nombre')} className="input" />
              {errP.nombre && <p className="error-text">{errP.nombre.message}</p>}
            </div>
            <div>
              <label className="label">Apellido</label>
              <input {...regP('apellido')} className="input" />
              {errP.apellido && <p className="error-text">{errP.apellido.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">TelÃ©fono (opcional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input {...regP('telefono')} className="input pl-9" placeholder="+504 XXXX-XXXX" />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input value={user?.email || ''} disabled
              className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar desde aquÃ­.</p>
          </div>

          <button type="submit" disabled={subP || updateProfile.isPending} className="btn-primary">
            {subP || updateProfile.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Cambiar contraseÃ±a */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-semibold text-gray-800">Cambiar contraseÃ±a</h2>
        </div>

        <form onSubmit={hsPw((d) => changePassword.mutate(d))} className="space-y-4">
          <div>
            <label className="label">ContraseÃ±a actual</label>
            <input {...regPw('currentPassword')} type="password" className="input"
              autoComplete="current-password" />
            {errPw.currentPassword && <p className="error-text">{errPw.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label">Nueva contraseÃ±a</label>
            <input {...regPw('newPassword')} type="password" className="input"
              placeholder="MÃ­n. 8 caracteres, 1 mayÃºscula, 1 nÃºmero"
              autoComplete="new-password" />
            {errPw.newPassword && <p className="error-text">{errPw.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirmar contraseÃ±a</label>
            <input {...regPw('confirm')} type="password" className="input"
              autoComplete="new-password" />
            {errPw.confirm && <p className="error-text">{errPw.confirm.message}</p>}
          </div>

          <button type="submit" disabled={subPw || changePassword.isPending} className="btn-secondary">
            {subPw || changePassword.isPending ? <Spinner size="sm" /> : 'Actualizar contraseÃ±a'}
          </button>
        </form>
      </div>
    </div>
  );
}
