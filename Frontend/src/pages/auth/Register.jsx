import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { Spinner } from '../../components/ui/Spinner';

const schema = z.object({
  nombre:    z.string().min(2, 'Mínimo 2 caracteres'),
  apellido:  z.string().min(2, 'Mínimo 2 caracteres'),
  email:     z.string().email('Email inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número'),
  confirmar: z.string(),
  tipo:      z.enum(['CLIENTE','MECANICO','TALLER','EMPRESA']),
}).refine(d => d.password === d.confirmar, {
  message: 'Las contraseñas no coinciden', path: ['confirmar'],
});

export default function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'CLIENTE' },
  });

  const onSubmit = async (data) => {
    try {
      await authApi.register(data);
      toast.success('Cuenta creada. Revisa tu correo para verificar tu cuenta.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-3xl font-bold text-gray-900">Sabueso</h1>
          <p className="text-gray-500 mt-1">Crea tu cuenta gratis</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Crear cuenta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input {...register('nombre')} className="input-field" placeholder="Juan" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input {...register('apellido')} className="input-field" placeholder="Pérez" />
                {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
              <select {...register('tipo')} className="input-field">
                <option value="CLIENTE">Cliente particular</option>
                <option value="MECANICO">Mecánico</option>
                <option value="TALLER">Taller</option>
                <option value="EMPRESA">Empresa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="tu@email.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input {...register('password')} type="password" className="input-field" placeholder="••••••••" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input {...register('confirmar')} type="password" className="input-field" placeholder="••••••••" />
              {errors.confirmar && <p className="text-red-500 text-xs mt-1">{errors.confirmar.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              Crear cuenta
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
