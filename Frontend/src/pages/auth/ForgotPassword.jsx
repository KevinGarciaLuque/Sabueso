import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import { Spinner } from '../../components/ui/Spinner';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    await authApi.resetRequest(data);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="text-gray-500 mt-1">Te enviaremos un enlace para restablecerla</p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">📧</div>
              <h2 className="text-lg font-semibold text-gray-800">Revisa tu correo</h2>
              <p className="text-gray-500 text-sm">
                Si el email está registrado, recibirás las instrucciones en unos minutos.
              </p>
              <Link to="/login" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  {...register('email')}
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? <Spinner size="sm" /> : 'Enviar instrucciones'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-orange-500 hover:text-orange-600">
                  Volver al login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
