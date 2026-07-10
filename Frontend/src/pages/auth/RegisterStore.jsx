import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { tiendasApi } from '../../api/index';
import { Spinner } from '../../components/ui/Spinner';

const schema = z.object({
  nombreComercial:     z.string().min(2, 'Requerido').max(150),
  rtn:                 z.string().max(20).optional(),
  telefono:            z.string().max(20).optional(),
  email:               z.string().email('Email inválido de la tienda'),
  ciudad:              z.string().min(2, 'Requerido').max(100),
  departamento:        z.string().max(100).optional(),
  descripcion:         z.string().max(500).optional(),
  propietarioNombre:   z.string().min(2, 'Requerido'),
  propietarioApellido: z.string().min(2, 'Requerido'),
  propietarioEmail:    z.string().email('Email del propietario inválido'),
  propietarioPassword: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Necesita una mayúscula')
    .regex(/[0-9]/, 'Necesita un número'),
});

export default function RegisterStore() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await tiendasApi.registrar(data);
      toast.success('¡Tienda registrada! Tu cuenta será revisada en 24-48 horas.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar la tienda');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-3xl font-bold text-gray-900">Registra tu tienda</h1>
          <p className="text-gray-500 mt-1">Empieza a recibir solicitudes de clientes</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Datos de la tienda</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial *</label>
                  <input {...register('nombreComercial')} className="input-field" placeholder="Repuestos El Motor" />
                  {errors.nombreComercial && <p className="text-red-500 text-xs mt-1">{errors.nombreComercial.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RTN</label>
                  <input {...register('rtn')} className="input-field" placeholder="0000-0000-000000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input {...register('telefono')} className="input-field" placeholder="+504 9999-9999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email de la tienda *</label>
                  <input {...register('email')} type="email" className="input-field" placeholder="tienda@email.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                  <input {...register('ciudad')} className="input-field" placeholder="Tegucigalpa" />
                  {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <input {...register('departamento')} className="input-field" placeholder="Francisco Morazán" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la tienda</label>
                  <textarea {...register('descripcion')} rows={2} className="input-field"
                    placeholder="Especialistas en repuestos japoneses..." />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Datos del propietario</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input {...register('propietarioNombre')} className="input-field" />
                  {errors.propietarioNombre && <p className="text-red-500 text-xs mt-1">{errors.propietarioNombre.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input {...register('propietarioApellido')} className="input-field" />
                  {errors.propietarioApellido && <p className="text-red-500 text-xs mt-1">{errors.propietarioApellido.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email del propietario *</label>
                  <input {...register('propietarioEmail')} type="email" className="input-field" />
                  {errors.propietarioEmail && <p className="text-red-500 text-xs mt-1">{errors.propietarioEmail.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input {...register('propietarioPassword')} type="password" className="input-field" />
                  {errors.propietarioPassword && <p className="text-red-500 text-xs mt-1">{errors.propietarioPassword.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {isSubmitting && <Spinner size="sm" />}
              Registrar tienda
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <Link to="/login" className="text-orange-600 hover:text-orange-700">← Volver al inicio de sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
