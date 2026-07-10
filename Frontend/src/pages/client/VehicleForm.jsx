import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { vehiculosApi, catalogoApi } from '../../api/index';
import { Spinner } from '../../components/ui/Spinner';
import { X } from 'lucide-react';

const schema = z.object({
  marcaId:      z.coerce.number().int().positive('Selecciona una marca'),
  modeloId:     z.coerce.number().int().positive('Selecciona un modelo'),
  versionId:    z.coerce.number().int().positive().optional().or(z.literal('')),
  anio:         z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1, 'Año inválido'),
  motor:        z.string().max(20).optional().or(z.literal('')),
  combustible:  z.enum(['GASOLINA','DIESEL','HIBRIDO','ELECTRICO','GAS','OTRO','']).optional(),
  transmision:  z.enum(['MANUAL','AUTOMATICA','CVT','OTRO','']).optional(),
  traccion:     z.enum(['4X2','4X4','AWD','FWD','RWD','']).optional(),
  color:        z.string().max(40).optional().or(z.literal('')),
  vin:          z.string().max(20).optional().or(z.literal('')),
  placa:        z.string().max(20).optional().or(z.literal('')),
  observaciones:z.string().max(500).optional().or(z.literal('')),
});

export default function VehicleForm({ vehiculo, onClose, onSaved }) {
  const esEdicion = !!vehiculo;

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: vehiculo ? {
      marcaId:      vehiculo.marca_id   || '',
      modeloId:     vehiculo.modelo_id  || '',
      versionId:    vehiculo.version_id || '',
      anio:         vehiculo.anio,
      motor:        vehiculo.motor        || '',
      combustible:  vehiculo.combustible  || '',
      transmision:  vehiculo.transmision  || '',
      traccion:     vehiculo.traccion     || '',
      color:        vehiculo.color        || '',
      vin:          vehiculo.vin          || '',
      placa:        vehiculo.placa        || '',
      observaciones:vehiculo.observaciones|| '',
    } : { anio: new Date().getFullYear() },
  });

  const marcaId   = watch('marcaId');
  const modeloId  = watch('modeloId');

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas'],
    queryFn: () => catalogoApi.marcas().then(r => r.data.data),
  });

  const { data: modelos = [] } = useQuery({
    queryKey: ['modelos', marcaId],
    queryFn: () => catalogoApi.modelos(marcaId).then(r => r.data.data),
    enabled: !!marcaId && Number(marcaId) > 0,
  });

  const { data: versiones = [] } = useQuery({
    queryKey: ['versiones', modeloId],
    queryFn: () => catalogoApi.versiones(modeloId).then(r => r.data.data),
    enabled: !!modeloId && Number(modeloId) > 0,
  });

  const guardar = useMutation({
    mutationFn: (data) => {
      const payload = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== '' && v !== null && v !== undefined) payload[k] = v;
      }
      return esEdicion
        ? vehiculosApi.editar(vehiculo.id, payload)
        : vehiculosApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(esEdicion ? 'Vehículo actualizado' : 'Vehículo agregado');
      onSaved();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al guardar'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar vehículo' : 'Agregar vehículo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => guardar.mutate(d))} className="p-6 space-y-5">
          {/* Marca / Modelo / Versión */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
              <select {...register('marcaId')} className="input-field">
                <option value="">— Seleccionar —</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              {errors.marcaId && <p className="text-red-500 text-xs mt-1">{errors.marcaId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
              <select {...register('modeloId')} className="input-field" disabled={!marcaId || Number(marcaId) === 0}>
                <option value="">— Seleccionar —</option>
                {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              {errors.modeloId && <p className="text-red-500 text-xs mt-1">{errors.modeloId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versión</label>
              <select {...register('versionId')} className="input-field" disabled={!modeloId || Number(modeloId) === 0}>
                <option value="">— Seleccionar —</option>
                {versiones.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} {v.anio_inicio && `(${v.anio_inicio}${v.anio_fin ? `-${v.anio_fin}` : '+'})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Año / Motor / Color */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
              <input {...register('anio')} type="number" className="input-field" placeholder="2006" />
              {errors.anio && <p className="text-red-500 text-xs mt-1">{errors.anio.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motor</label>
              <input {...register('motor')} className="input-field" placeholder="1.6, 2.0T..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input {...register('color')} className="input-field" placeholder="Plateado" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
              <input {...register('placa')} className="input-field" placeholder="AAA-1234" />
            </div>
          </div>

          {/* Combustible / Transmisión / Tracción */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Combustible</label>
              <select {...register('combustible')} className="input-field">
                <option value="">— Seleccionar —</option>
                <option value="GASOLINA">Gasolina</option>
                <option value="DIESEL">Diésel</option>
                <option value="HIBRIDO">Híbrido</option>
                <option value="ELECTRICO">Eléctrico</option>
                <option value="GAS">Gas</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transmisión</label>
              <select {...register('transmision')} className="input-field">
                <option value="">— Seleccionar —</option>
                <option value="MANUAL">Manual</option>
                <option value="AUTOMATICA">Automática</option>
                <option value="CVT">CVT</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracción</label>
              <select {...register('traccion')} className="input-field">
                <option value="">— Seleccionar —</option>
                <option value="4X2">4×2</option>
                <option value="4X4">4×4</option>
                <option value="AWD">AWD</option>
                <option value="FWD">FWD</option>
                <option value="RWD">RWD</option>
              </select>
            </div>
          </div>

          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VIN
              <span className="ml-2 text-xs text-gray-400 font-normal">
                (Número de identificación del vehículo — mejora la compatibilidad de piezas)
              </span>
            </label>
            <input {...register('vin')} className="input-field font-mono uppercase"
              placeholder="JM7BK12F060123456" maxLength={20} />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea {...register('observaciones')} rows={2} className="input-field"
              placeholder="Ej: versión con sunroof, importado de Japón, motor cambiado..." />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting || guardar.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {(isSubmitting || guardar.isPending) && <Spinner size="sm" />}
              {esEdicion ? 'Guardar cambios' : 'Agregar vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
