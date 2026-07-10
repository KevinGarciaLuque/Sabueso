import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { solicitudesApi, ofertasApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { UrgenciaBadge, EstadoBadge } from '../../components/ui/Badge';
import { ArrowLeft, Car, MapPin, Shield, Tag, CheckCircle, Send } from 'lucide-react';
import { TIPO_REPUESTO_LABEL, CONDICION_LABEL } from '../../utils/constants';

const ofertaSchema = z.object({
  precio:            z.coerce.number({ required_error: 'Requerido' }).positive('Debe ser mayor a 0'),
  costoEnvio:        z.coerce.number().min(0).default(0),
  tipoRepuesto:      z.enum(['ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO','RECONSTRUIDO','ALTERNATIVO','DESARMADERO']),
  condicion:         z.enum(['NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES','PARA_RECONSTRUCCION']),
  marcaFabricante:   z.string().max(100).optional().or(z.literal('')),
  numeroOem:         z.string().max(80).optional().or(z.literal('')),
  garantiaDias:      z.coerce.number().int().min(0).default(0),
  disponibilidad:    z.enum(['INMEDIATA','1_DIA','2_3_DIAS','1_SEMANA','A_PEDIDO']),
  metodoEntrega:     z.enum(['RETIRO','ENVIO_LOCAL','ENVIO_NACIONAL','MOTORISTA']),
  compatibilidad:    z.enum(['CONFIRMADA_VIN','CONFIRMADA_OEM','POR_REVISAR','REQUIERE_COMPARACION']),
  incluyeAccesorios:    z.boolean().default(false),
  requierePiezaVieja:   z.boolean().default(false),
  requiereAdaptacion:   z.boolean().default(false),
  observaciones:     z.string().max(1000).optional().or(z.literal('')),
});

export default function StoreRequestDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: solicitud, isLoading } = useQuery({
    queryKey: ['solicitud-tienda', id],
    queryFn: () => solicitudesApi.obtener(id).then(r => r.data.data),
  });

  const { data: misOfertas = [] } = useQuery({
    queryKey: ['mis-ofertas-solicitud', id],
    queryFn: () => ofertasApi.listarMis({ limit: 50 }).then(r =>
      r.data.data.filter(o => o.solicitud_id === Number(id))
    ),
    enabled: !!solicitud,
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(ofertaSchema),
    defaultValues: {
      tipoRepuesto:   'GENERICO_NUEVO',
      condicion:      'NUEVO',
      disponibilidad: 'INMEDIATA',
      metodoEntrega:  'RETIRO',
      compatibilidad: 'POR_REVISAR',
      costoEnvio:     0,
      garantiaDias:   0,
    },
  });

  const precio      = watch('precio') || 0;
  const costoEnvio  = watch('costoEnvio') || 0;

  const enviar = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, solicitudId: Number(id) };
      for (const k of ['marcaFabricante','numeroOem','observaciones']) {
        if (!payload[k]) delete payload[k];
      }
      return ofertasApi.enviar(payload);
    },
    onSuccess: () => {
      toast.success('¡Oferta enviada exitosamente!');
      setShowForm(false);
      qc.invalidateQueries(['mis-ofertas-solicitud', id]);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al enviar oferta'),
  });

  if (isLoading) return <PageLoader />;
  if (!solicitud) return <div className="text-center py-20 text-gray-400">Solicitud no encontrada</div>;

  const yaOferto = misOfertas.length > 0;
  const puedeOfertar = ['PUBLICADA','RECIBIENDO_OFERTAS'].includes(solicitud.estado);

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/tienda/solicitudes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Bandeja de solicitudes
      </Link>

      {/* Solicitud */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{solicitud.nombre_repuesto}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <EstadoBadge estado={solicitud.estado} />
              <UrgenciaBadge urgencia={solicitud.urgencia} />
              {solicitud.lado && (
                <span className="badge-blue">{solicitud.lado.charAt(0) + solicitud.lado.slice(1).toLowerCase()}</span>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>{new Date(solicitud.creado_en).toLocaleDateString('es-HN')}</p>
            <p className="mt-1">{solicitud.total_ofertas} oferta{solicitud.total_ofertas !== 1 ? 's' : ''} recibidas</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-5 border-t text-sm">
          {solicitud.marca_nombre && (
            <div className="flex items-start gap-2">
              <Car className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Vehículo</p>
                <p className="font-medium">{solicitud.marca_nombre} {solicitud.modelo_nombre} {solicitud.anio} {solicitud.motor && `· ${solicitud.motor}`}</p>
              </div>
            </div>
          )}
          {solicitud.ciudad && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Ciudad</p>
                <p className="font-medium">{solicitud.ciudad}</p>
              </div>
            </div>
          )}
          {solicitud.condicion_aceptada && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Condición aceptada</p>
                <p className="font-medium">{solicitud.condicion_aceptada === 'CUALQUIERA' ? 'Nueva o usada' : solicitud.condicion_aceptada.toLowerCase()}</p>
              </div>
            </div>
          )}
          {solicitud.presupuesto_max && (
            <div>
              <p className="text-xs text-gray-400">Presupuesto máximo</p>
              <p className="font-medium text-green-600">L {Number(solicitud.presupuesto_max).toLocaleString('es-HN')}</p>
            </div>
          )}
          {solicitud.vin && (
            <div className="flex items-start gap-2 col-span-2">
              <Shield className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">VIN</p>
                <p className="font-mono font-medium">{solicitud.vin}</p>
              </div>
            </div>
          )}
        </div>

        {solicitud.descripcion && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-400 mb-1">Descripción del cliente</p>
            <p className="text-sm text-gray-700">{solicitud.descripcion}</p>
          </div>
        )}

        {solicitud.imagenes?.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-400 mb-2">Fotos de referencia</p>
            <div className="flex gap-3 flex-wrap">
              {solicitud.imagenes.map(img => (
                <img key={img.id} src={img.url} alt="Ref"
                  className="w-24 h-24 object-cover rounded-lg border" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mi oferta previa */}
      {yaOferto && (
        <div className="card border-green-300 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-green-800">Ya enviaste una oferta</h3>
          </div>
          {misOfertas.map(o => (
            <div key={o.id} className="text-sm text-green-700">
              <span className="font-bold">L {Number(o.precio).toLocaleString('es-HN')}</span>
              {' · '}{TIPO_REPUESTO_LABEL[o.tipo_repuesto]}
              {' · Estado: '}<strong>{o.estado}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Botón / formulario oferta */}
      {puedeOfertar && !yaOferto && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 text-base py-3 px-6">
          <Send className="w-5 h-5" /> Enviar oferta
        </button>
      )}

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Enviar oferta</h2>
          <form onSubmit={handleSubmit(d => enviar.mutate(d))} className="space-y-5">

            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio del repuesto (L) *</label>
                <input {...register('precio')} type="number" step="0.01" className="input-field text-lg font-bold" placeholder="0.00" />
                {errors.precio && <p className="text-red-500 text-xs mt-1">{errors.precio.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo de envío (L)</label>
                <input {...register('costoEnvio')} type="number" step="0.01" className="input-field" placeholder="0.00" />
              </div>
            </div>

            {/* Total en vivo */}
            {(Number(precio) > 0) && (
              <div className="p-3 bg-orange-50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-gray-600">Total para el cliente:</span>
                <span className="text-xl font-bold text-orange-600">
                  L {(Number(precio) + Number(costoEnvio)).toLocaleString('es-HN')}
                </span>
              </div>
            )}

            {/* Tipo y condición */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de repuesto *</label>
                <select {...register('tipoRepuesto')} className="input-field">
                  {Object.entries(TIPO_REPUESTO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición *</label>
                <select {...register('condicion')} className="input-field">
                  {Object.entries(CONDICION_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Marca / OEM */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca del fabricante</label>
                <input {...register('marcaFabricante')} className="input-field" placeholder="CTR, Moog, Monroe..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número OEM</label>
                <input {...register('numeroOem')} className="input-field font-mono" placeholder="BJ51-3301-AE" />
              </div>
            </div>

            {/* Compatibilidad / Disponibilidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compatibilidad *</label>
                <select {...register('compatibilidad')} className="input-field">
                  <option value="CONFIRMADA_VIN">✓ Confirmada por VIN</option>
                  <option value="CONFIRMADA_OEM">✓ Confirmada por OEM</option>
                  <option value="POR_REVISAR">⚠ Por revisar</option>
                  <option value="REQUIERE_COMPARACION">⚠ Requiere comparación física</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garantía (días)</label>
                <input {...register('garantiaDias')} type="number" className="input-field" placeholder="30, 60, 90..." />
              </div>
            </div>

            {/* Entrega / Disponibilidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilidad *</label>
                <select {...register('disponibilidad')} className="input-field">
                  <option value="INMEDIATA">Inmediata</option>
                  <option value="1_DIA">1 día hábil</option>
                  <option value="2_3_DIAS">2-3 días</option>
                  <option value="1_SEMANA">1 semana</option>
                  <option value="A_PEDIDO">A pedido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de entrega *</label>
                <select {...register('metodoEntrega')} className="input-field">
                  <option value="RETIRO">Retiro en tienda</option>
                  <option value="ENVIO_LOCAL">Envío local</option>
                  <option value="ENVIO_NACIONAL">Envío nacional</option>
                  <option value="MOTORISTA">Por motorista</option>
                </select>
              </div>
            </div>

            {/* Checks */}
            <div className="space-y-2">
              {[
                ['incluyeAccesorios',   '✓ Incluye accesorios o piezas complementarias'],
                ['requierePiezaVieja',  '⚠ El cliente debe entregar la pieza vieja'],
                ['requiereAdaptacion',  '⚠ Puede requerir adaptación'],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input {...register(name)} type="checkbox" className="w-4 h-4 text-orange-500 rounded" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones adicionales</label>
              <textarea {...register('observaciones')} rows={3} className="input-field"
                placeholder="Información adicional relevante para el cliente..." />
            </div>

            <div className="flex gap-3 pt-2 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting || enviar.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {(isSubmitting || enviar.isPending) && <Spinner size="sm" />}
                <Send className="w-4 h-4" /> Enviar oferta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
