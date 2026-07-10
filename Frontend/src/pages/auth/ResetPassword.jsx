import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { Spinner } from '../../components/ui/Spinner';

const schema = z.object({
  newPassword: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Necesita al menos una mayúscula')
    .regex(/[0-9]/, 'Necesita al menos un número'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
});

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ newPassword }) => {
    try {
      await authApi.resetPass({ token, newPassword });
      toast.success('Contraseña restablecida. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'El enlace expiró o no es válido');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-gray-500 mt-1">Elige una contraseña segura para tu cuenta</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <input
                {...register('newPassword')}
                type="password"
                className="input"
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                autoComplete="new-password"
              />
              {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                {...register('confirm')}
                type="password"
                className="input"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
              {errors.confirm && <p className="error-text">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? <Spinner size="sm" /> : 'Restablecer contraseña'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link to="/login" className="text-orange-500 hover:text-orange-600">
                Volver al login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
