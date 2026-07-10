import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { solicitudesApi, vehiculosApi, catalogoApi } from '../../api/index';
import { Spinner } from '../../components/ui/Spinner';
import { ImageUploader } from '../../components/ui/ImageUploader';

const schema = z.object({
  vehiculoId:        z.coerce.number().int().positive().optional(),
  categoriaId:       z.coerce.number().int().positive().optional(),
  nombreRepuesto:    z.string().min(3, 'Mínimo 3 caracteres').max(200),
  descripcion:       z.string().max(2000).optional(),
  lado:              z.enum(['IZQUIERDO','DERECHO','DELANTERO','TRASERO','CENTRAL','NO_APLICA','']).optional(),
  cantidad:          z.coerce.number().int().min(1).max(99).default(1),
  condicionAceptada: z.enum(['NUEVO','USADO','CUALQUIERA']).default('CUALQUIERA'),
  presupuestoMax:    z.coerce.number().positive().optional().or(z.literal('')),
  ciudad:            z.string().max(100).optional(),
  urgencia:          z.enum(['BAJA','MEDIA','ALTA','CRITICA']).default('MEDIA'),
  fechaLimite:       z.string().optional().or(z.literal('')),
  publicarAhora:     z.boolean().default(true),
});

export default function NewRequest() {
  const navigate = useNavigate();
  const [createdId, setCreatedId] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { urgencia: 'MEDIA', condicionAceptada: 'CUALQUIERA', cantidad: 1, publicarAhora: true },
  });

  const { data: vehiculos = [] } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: () => vehiculosApi.listar().then(r => r.data.data),
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => catalogoApi.categorias().then(r => r.data.data),
  });

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.lado) delete payload.lado;
      if (!payload.presupuestoMax || payload.presupuestoMax === '') delete payload.presupuestoMax;
      if (!payload.vehiculoId) delete payload.vehiculoId;
      if (!payload.categoriaId) delete payload.categoriaId;
      if (!payload.fechaLimite) delete payload.fechaLimite;
      else payload.fechaLimite = new Date(payload.fechaLimite).toISOString();

      const publicar = payload.publicarAhora;
      delete payload.publicarAhora;

      const res = await solicitudesApi.crear(payload);
      const { id } = res.data.data;
      setCreatedId(id);

      if (publicar) {
        await solicitudesApi.publicar(id);
        toast.success('¡Solicitud publicada! Las tiendas ya pueden verte.');
      } else {
        toast.success('Solicitud creada — agrega fotos y luego publícala');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear solicitud');
    }
  };

  // After creation: show image uploader step
  if (createdId) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Agregar fotos</h1>
          <p className="text-gray-500 mt-1">Sube fotos de referencia para ayudar a las tiendas (opcional)</p>
        </div>
        <div className="card space-y-4">
          <ImageUploader
            endpoint={`/uploads/solicitud/${createdId}`}
            onUploaded={() => {}}
          />
          <div className="flex gap-3 pt-2 border-t">
            <button onClick={() => navigate(`/cliente/solicitudes/${createdId}`)}
              className="btn-secondary flex-1">
              Omitir fotos
            </button>
            <button onClick={() => navigate(`/cliente/solicitudes/${createdId}`)}
              className="btn-primary flex-1">
              Ver mi solicitud →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva solicitud</h1>
        <p className="text-gray-500 mt-1">Publica el repuesto que necesitas y recibe ofertas</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
            <select {...register('vehiculoId')} className="input-field">
              <option value="">— Sin vehículo específico —</option>
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.marca_nombre} {v.modelo_nombre} {v.anio} {v.motor && `(${v.motor})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Selecciona un vehículo para mejores coincidencias.{' '}
              <a href="/cliente/vehiculos/nuevo" className="text-orange-500">Agregar vehículo</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del repuesto *</label>
            <input {...register('nombreRepuesto')} className="input-field"
              placeholder="Ej: Tijera delantera, Amortiguador trasero..." />
            {errors.nombreRepuesto && <p className="text-red-500 text-xs mt-1">{errors.nombreRepuesto.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select {...register('categoriaId')} className="input-field">
                <option value="">— Seleccionar —</option>
                {categorias.filter(c => !c.padre_id).map(c => (
                  <optgroup key={c.id} label={c.nombre}>
                    {categorias.filter(s => s.padre_id === c.id).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lado</label>
              <select {...register('lado')} className="input-field">
                <option value="">— No aplica —</option>
                <option value="IZQUIERDO">Izquierdo</option>
                <option value="DERECHO">Derecho</option>
                <option value="DELANTERO">Delantero</option>
                <option value="TRASERO">Trasero</option>
                <option value="CENTRAL">Central</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción adicional</label>
            <textarea {...register('descripcion')} rows={3} className="input-field"
              placeholder="Detalles adicionales, síntomas, número de pieza si lo conoces..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición aceptada</label>
              <select {...register('condicionAceptada')} className="input-field">
                <option value="CUALQUIERA">Cualquiera</option>
                <option value="NUEVO">Solo nueva</option>
                <option value="USADO">Usada en buen estado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgencia</label>
              <select {...register('urgencia')} className="input-field">
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto máximo (L)</label>
              <input {...register('presupuestoMax')} type="number" className="input-field"
                placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input {...register('ciudad')} className="input-field" placeholder="Tegucigalpa" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha límite para recibir ofertas
                <span className="ml-1 text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <input {...register('fechaLimite')} type="datetime-local"
                min={new Date(Date.now() + 3600000).toISOString().slice(0,16)}
                className="input-field" />
              <p className="text-xs text-gray-400 mt-1">Las ofertas que lleguen después no se aceptarán</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input {...register('cantidad')} type="number" min={1} max={99} className="input-field" defaultValue={1} />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <input {...register('publicarAhora')} type="checkbox" id="publicar"
              className="w-4 h-4 text-orange-500 rounded" />
            <label htmlFor="publicar" className="text-sm text-gray-700">
              Publicar inmediatamente (las tiendas verán tu solicitud al instante)
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              Crear solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
