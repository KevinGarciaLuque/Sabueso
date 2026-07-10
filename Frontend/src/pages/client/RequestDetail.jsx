import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { solicitudesApi, ofertasApi, chatApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { EstadoBadge, UrgenciaBadge } from '../../components/ui/Badge';
import { ReportarModal } from '../../components/ui/ReportarModal';
import {
  ArrowLeft, Car, MapPin, Calendar, Tag, MessageSquare,
  CheckCircle, Star, Shield, Truck, Clock, ChevronDown, ChevronUp,
  AlertTriangle, Award, Flag
} from 'lucide-react';
import { TIPO_REPUESTO_LABEL, CONDICION_LABEL, DISPONIBILIDAD_LABEL } from '../../utils/constants';

const COMPAT_COLOR = {
  CONFIRMADA_VIN:  'text-green-600 bg-green-50',
  CONFIRMADA_OEM:  'text-green-600 bg-green-50',
  POR_REVISAR:     'text-yellow-600 bg-yellow-50',
  REQUIERE_COMPARACION: 'text-orange-600 bg-orange-50',
};
const COMPAT_LABEL = {
  CONFIRMADA_VIN:  '✓ Confirmada por VIN',
  CONFIRMADA_OEM:  '✓ Confirmada por OEM',
  POR_REVISAR:     '⚠ Por revisar',
  REQUIERE_COMPARACION: '⚠ Requiere comparación',
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [vistaComparador, setVistaComparador] = useState(false);
  const [expandida, setExpandida] = useState(null);
  const [reportando, setReportando] = useState(null);

  const { data: solicitud, isLoading: loadingS } = useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => solicitudesApi.obtener(id).then(r => r.data.data),
  });

  const { data: ofertas = [], isLoading: loadingO } = useQuery({
    queryKey: ['ofertas-solicitud', id],
    queryFn: () => ofertasApi.listarPorSolicitud(id).then(r => r.data.data),
    enabled: !!solicitud,
  });

  const seleccionar = useMutation({
    mutationFn: (ofertaId) => ofertasApi.seleccionar(ofertaId),
    onSuccess: () => {
      toast.success('¡Oferta seleccionada! Contacta a la tienda por el chat.');
      qc.invalidateQueries(['solicitud', id]);
      qc.invalidateQueries(['ofertas-solicitud', id]);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const iniciarChat = useMutation({
    mutationFn: ({ ofertaId, tenantId }) =>
      chatApi.iniciar({ solicitudId: Number(id), ofertaId, tenantId }),
    onSuccess: (res) => {
      navigate(`/cliente/chat?conversacion=${res.data.data.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'No se pudo iniciar el chat'),
  });

  if (loadingS) return <PageLoader />;
  if (!solicitud) return (
    <div className="text-center py-20 text-gray-400">Solicitud no encontrada</div>
  );

  const puedeSeleccionar = ['PUBLICADA','RECIBIENDO_OFERTAS'].includes(solicitud.estado);
  const ofertasOrdenadas = [...ofertas].sort((a, b) => (b.score?.score_total || 0) - (a.score?.score_total || 0));

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <Link to="/cliente/solicitudes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Mis solicitudes
      </Link>

      {/* Header solicitud */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{solicitud.nombre_repuesto}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <EstadoBadge estado={solicitud.estado} />
              <UrgenciaBadge urgencia={solicitud.urgencia} />
              {solicitud.total_ofertas > 0 && (
                <span className="badge-orange">{solicitud.total_ofertas} oferta{solicitud.total_ofertas !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Publicada</p>
            <p className="text-sm text-gray-600">{new Date(solicitud.creado_en).toLocaleDateString('es-HN')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t">
          {solicitud.marca_nombre && (
            <div className="flex items-start gap-2">
              <Car className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Vehículo</p>
                <p className="text-sm font-medium text-gray-800">
                  {solicitud.marca_nombre} {solicitud.modelo_nombre} {solicitud.anio}
                  {solicitud.motor && ` · ${solicitud.motor}`}
                </p>
              </div>
            </div>
          )}
          {solicitud.ciudad && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Ciudad</p>
                <p className="text-sm font-medium text-gray-800">{solicitud.ciudad}</p>
              </div>
            </div>
          )}
          {solicitud.fecha_limite && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Límite</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(solicitud.fecha_limite).toLocaleDateString('es-HN')}
                </p>
              </div>
            </div>
          )}
          {solicitud.presupuesto_max && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Presupuesto máx.</p>
                <p className="text-sm font-medium text-gray-800">
                  L {Number(solicitud.presupuesto_max).toLocaleString('es-HN')}
                </p>
              </div>
            </div>
          )}
        </div>

        {solicitud.descripcion && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">{solicitud.descripcion}</p>
          </div>
        )}

        {solicitud.vin && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Shield className="w-3.5 h-3.5" />
            VIN: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{solicitud.vin}</span>
          </div>
        )}
      </div>

      {/* Imágenes de la solicitud */}
      {solicitud.imagenes?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Fotos de referencia</h2>
          <div className="flex gap-3 flex-wrap">
            {solicitud.imagenes.map(img => (
              <img key={img.id} src={img.url} alt="Referencia"
                className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
            ))}
          </div>
        </div>
      )}

      {/* Sección ofertas */}
      {loadingO ? (
        <div className="card flex justify-center py-8"><PageLoader /></div>
      ) : ofertas.length === 0 ? (
        <div className="card text-center py-12">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-600">Aún no hay ofertas</h3>
          <p className="text-sm text-gray-400 mt-1">Las tiendas estarán enviando ofertas pronto</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {ofertas.length} oferta{ofertas.length !== 1 ? 's' : ''} recibida{ofertas.length !== 1 ? 's' : ''}
            </h2>
            <button onClick={() => setVistaComparador(!vistaComparador)}
              className="btn-secondary text-sm flex items-center gap-2">
              {vistaComparador ? 'Vista normal' : 'Comparar ofertas'}
            </button>
          </div>

          {/* Aviso compatibilidad */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            La compatibilidad debe confirmarse mediante VIN, número de pieza o revisión física antes de realizar la compra.
          </div>

          {vistaComparador ? (
            <ComparadorTabla ofertas={ofertasOrdenadas} puedeSeleccionar={puedeSeleccionar}
              onSeleccionar={(oid) => seleccionar.mutate(oid)}
              onChat={(o) => iniciarChat.mutate({ ofertaId: o.id, tenantId: o.tenant_id })}
              onReportar={(o) => setReportando({ tenantId: o.tenant_id, tenantNombre: o.tienda_nombre })} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {ofertasOrdenadas.map((o, idx) => (
                <OfertaCard key={o.id} oferta={o} idx={idx}
                  puedeSeleccionar={puedeSeleccionar}
                  expandida={expandida === o.id}
                  onToggle={() => setExpandida(expandida === o.id ? null : o.id)}
                  onSeleccionar={() => seleccionar.mutate(o.id)}
                  onChat={() => iniciarChat.mutate({ ofertaId: o.id, tenantId: o.tenant_id })}
                  onReportar={() => setReportando({ tenantId: o.tenant_id, tenantNombre: o.tienda_nombre })}
                  seleccionando={seleccionar.isPending} />
              ))}
            </div>
          )}
        </div>
      )}

      {reportando && (
        <ReportarModal tenantId={reportando.tenantId} tenantNombre={reportando.tenantNombre}
          onClose={() => setReportando(null)} />
      )}
    </div>
  );
}

function OfertaCard({ oferta: o, idx, puedeSeleccionar, expandida, onToggle, onSeleccionar, onChat, onReportar, seleccionando }) {
  const esMejor = idx === 0;
  const score = o.score ? Math.round(o.score.score_total) : null;

  return (
    <div className={`card p-0 overflow-hidden transition-shadow hover:shadow-md ${
      o.estado === 'ACEPTADA' ? 'border-2 border-green-400' : esMejor ? 'border-2 border-orange-300' : ''
    }`}>
      {/* Badge mejor oferta */}
      {esMejor && o.estado !== 'ACEPTADA' && (
        <div className="bg-orange-500 text-white text-xs font-semibold px-4 py-1 flex items-center gap-1">
          <Award className="w-3.5 h-3.5" /> Mejor oferta
        </div>
      )}
      {o.estado === 'ACEPTADA' && (
        <div className="bg-green-500 text-white text-xs font-semibold px-4 py-1 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> Oferta seleccionada
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Tienda info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-400">
              {o.tienda_nombre?.[0] || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{o.tienda_nombre}</p>
                {o.tienda_verificada && (
                  <span title="Tienda verificada"><Shield className="w-4 h-4 text-blue-500" /></span>
                )}
              </div>
              {o.tienda_rating > 0 && (
                <div className="flex items-center gap-1 text-xs text-yellow-600">
                  <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
                  {Number(o.tienda_rating).toFixed(1)}
                  {o.total_calificaciones > 0 && <span className="text-gray-400">({o.total_calificaciones})</span>}
                </div>
              )}
            </div>
          </div>

          {/* Precio */}
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              L {Number(o.precio).toLocaleString('es-HN')}
            </p>
            {o.costo_envio > 0 && (
              <p className="text-xs text-gray-400">+ L {Number(o.costo_envio).toLocaleString('es-HN')} envío</p>
            )}
            {o.costo_envio === 0 && <p className="text-xs text-green-600">Envío incluido / retiro</p>}
            {score && (
              <div className="mt-1 text-xs text-orange-600 font-medium">Score: {score}pts</div>
            )}
          </div>
        </div>

        {/* Tags rápidos */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${COMPAT_COLOR[o.compatibilidad]}`}>
            {COMPAT_LABEL[o.compatibilidad]}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {TIPO_REPUESTO_LABEL[o.tipo_repuesto] || o.tipo_repuesto}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {CONDICION_LABEL[o.condicion] || o.condicion}
          </span>
          {o.garantia_dias > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
              <Shield className="w-3 h-3 inline mr-1" />
              {o.garantia_dias}d garantía
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {DISPONIBILIDAD_LABEL[o.disponibilidad]}
          </span>
        </div>

        {/* Expandible */}
        {expandida && (
          <div className="mt-4 pt-4 border-t space-y-3 text-sm text-gray-600">
            {o.marca_fabricante && <p><span className="font-medium text-gray-800">Fabricante:</span> {o.marca_fabricante}</p>}
            {o.numero_oem      && <p><span className="font-medium text-gray-800">N° OEM:</span> <span className="font-mono">{o.numero_oem}</span></p>}
            {o.numero_alterno  && <p><span className="font-medium text-gray-800">N° Alterno:</span> <span className="font-mono">{o.numero_alterno}</span></p>}
            {o.metodo_entrega  && <p><span className="font-medium text-gray-800">Entrega:</span> {o.metodo_entrega.replace('_', ' ')}</p>}
            {o.score?.distancia_km != null && <p><span className="font-medium text-gray-800">Distancia:</span> {o.score.distancia_km} km</p>}
            {o.tienda_ventas > 0 && <p><span className="font-medium text-gray-800">Ventas realizadas:</span> {o.tienda_ventas}</p>}
            {o.incluye_accesorios    && <p className="text-green-600">✓ Incluye accesorios</p>}
            {o.requiere_pieza_vieja  && <p className="text-amber-600">⚠ Requiere entregar pieza vieja</p>}
            {o.requiere_adaptacion   && <p className="text-amber-600">⚠ Puede requerir adaptación</p>}
            {o.observaciones         && <p className="italic text-gray-500">"{o.observaciones}"</p>}
            {o.imagenes?.length > 0  && (
              <div className="flex gap-2">
                {o.imagenes.map(img => (
                  <img key={img.id} src={img.url} alt="Oferta"
                    className="w-20 h-20 object-cover rounded-lg border" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-3">
            <button onClick={onToggle}
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
              {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandida ? 'Ver menos' : 'Ver detalles'}
            </button>
            <button onClick={onReportar} title="Reportar tienda"
              className="text-gray-300 hover:text-red-500 transition-colors">
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onChat}
              className="btn-secondary text-sm flex items-center gap-1.5 py-1.5 px-3">
              <MessageSquare className="w-4 h-4" /> Preguntar
            </button>
            {puedeSeleccionar && o.estado !== 'ACEPTADA' && (
              <button onClick={onSeleccionar} disabled={seleccionando}
                className="btn-primary text-sm flex items-center gap-1.5 py-1.5 px-3">
                <CheckCircle className="w-4 h-4" /> Seleccionar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparadorTabla({ ofertas, puedeSeleccionar, onSeleccionar, onChat, onReportar }) {
  if (ofertas.length === 0) return null;

  const rows = [
    { label: 'Marca/Fabricante', fn: o => o.marca_fabricante || '—' },
    { label: 'Precio pieza',  fn: o => `L ${Number(o.precio).toLocaleString('es-HN')}` },
    { label: 'Envío',         fn: o => o.costo_envio === 0 ? 'Incluido' : `L ${Number(o.costo_envio).toLocaleString('es-HN')}` },
    { label: 'Precio total',  fn: o => <strong>L {Number(o.precio_total).toLocaleString('es-HN')}</strong> },
    { label: 'Tipo',          fn: o => TIPO_REPUESTO_LABEL[o.tipo_repuesto] || o.tipo_repuesto },
    { label: 'Condición',     fn: o => CONDICION_LABEL[o.condicion] },
    { label: 'Compatibilidad',fn: o => <span className={`text-xs font-medium ${COMPAT_COLOR[o.compatibilidad]?.split(' ')[0]}`}>{COMPAT_LABEL[o.compatibilidad]}</span> },
    { label: 'Garantía',      fn: o => o.garantia_dias > 0 ? `${o.garantia_dias} días` : 'Sin garantía' },
    { label: 'Disponibilidad',fn: o => DISPONIBILIDAD_LABEL[o.disponibilidad] },
    { label: 'Entrega',       fn: o => o.metodo_entrega?.replace('_',' ') },
    { label: 'Distancia',     fn: o => o.score?.distancia_km != null ? `${o.score.distancia_km} km` : 'N/D' },
    { label: 'Rating tienda', fn: o => o.tienda_rating > 0 ? `⭐ ${Number(o.tienda_rating).toFixed(1)}` : 'Sin rating' },
    { label: 'Ventas de la tienda', fn: o => o.tienda_ventas > 0 ? o.tienda_ventas : '—' },
    { label: 'Score', fn: o => o.score ? <span className="font-semibold text-orange-600">{Math.round(o.score.score_total)}pts</span> : '—' },
  ];

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b">
            <th className="text-left px-4 py-3 font-medium text-gray-600 w-32">Característica</th>
            {ofertas.map((o, i) => (
              <th key={o.id} className={`text-center px-4 py-3 font-medium ${i === 0 ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`}>
                {o.tienda_nombre}
                {i === 0 && <div className="text-xs font-normal text-orange-500">Mejor oferta</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.label} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-500 font-medium">{r.label}</td>
              {ofertas.map((o, i) => (
                <td key={o.id} className={`px-4 py-2.5 text-center ${i === 0 ? 'bg-orange-50/50' : ''}`}>
                  {r.fn(o)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3"></td>
            {ofertas.map(o => (
              <td key={o.id} className="px-4 py-3 text-center">
                <div className="flex flex-col gap-2">
                  <button onClick={() => onChat(o)}
                    className="btn-secondary text-xs py-1">Preguntar</button>
                  {puedeSeleccionar && o.estado !== 'ACEPTADA' && (
                    <button onClick={() => onSeleccionar(o.id)}
                      className="btn-primary text-xs py-1">Seleccionar</button>
                  )}
                  <button onClick={() => onReportar(o)}
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 py-0.5">
                    <Flag className="w-3 h-3" /> Reportar
                  </button>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
