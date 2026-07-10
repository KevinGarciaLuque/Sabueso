import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Spinner } from '../../components/ui/Spinner';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">🐾</div>

        {status === 'loading' && (
          <>
            <Spinner />
            <p className="mt-4 text-gray-500">Verificando tu cuenta...</p>
          </>
        )}

        {status === 'success' && (
          <div className="card p-8 space-y-4">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-gray-900">¡Cuenta verificada!</h1>
            <p className="text-gray-500">Tu correo electrónico ha sido confirmado correctamente.</p>
            <Link to="/login" className="btn-primary inline-block mt-2">
              Iniciar sesión
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="card p-8 space-y-4">
            <div className="text-5xl">❌</div>
            <h1 className="text-2xl font-bold text-gray-900">Enlace inválido</h1>
            <p className="text-gray-500">
              El enlace de verificación no es válido o ya expiró.
              Inicia sesión y solicita un nuevo correo de verificación.
            </p>
            <Link to="/login" className="btn-primary inline-block mt-2">
              Ir al login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
