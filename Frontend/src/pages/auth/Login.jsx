import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { isStoreUser, isPlatformAdmin } from '../../utils/constants';
import { Spinner } from '../../components/ui/Spinner';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export default function Login() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data);
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);

      if (isPlatformAdmin(user.tipo)) return navigate('/admin');
      if (isStoreUser(user.tipo))     return navigate('/tienda');
      navigate('/cliente');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-3xl font-bold text-gray-900">Sabueso</h1>
          <p className="text-gray-500 mt-1">Encontramos el repuesto que buscas</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input-field"
                placeholder="tu@email.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input {...register('password')} type={showPass ? 'text' : 'password'} className="input-field pr-10"
                  placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/recuperar-password" className="text-sm text-orange-600 hover:text-orange-700">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              Entrar
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-orange-600 hover:text-orange-700 font-medium">Regístrate</Link>
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            ¿Eres una tienda?{' '}
            <Link to="/registro-tienda" className="text-orange-600 hover:text-orange-700 font-medium">Registra tu tienda</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
