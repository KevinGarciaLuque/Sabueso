import { useQuery } from '@tanstack/react-query';
import { estadisticasApi, catalogoApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { CreditCard, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';

export default function StoreMembership() {
  const { data, isLoading: loadingStats } = useQuery({
    queryKey: ['estadisticas-tienda'],
    queryFn: () => estadisticasApi.tienda().then(r => r.data.data),
  });

  const { data: planes = [], isLoading: loadingPlanes } = useQuery({
    queryKey: ['planes'],
    queryFn: () => catalogoApi.planes().then(r => r.data.data),
  });

  if (loadingStats || loadingPlanes) return <PageLoader />;

  const suscripcion = data?.suscripcion;
  const diasRestantes = suscripcion ? Number(suscripcion.dias_restantes) : null;

  const urgencia = diasRestantes !== null
    ? diasRestantes <= 3  ? 'critica'
    : diasRestantes <= 7  ? 'alta'
    : diasRestantes <= 14 ? 'media'
    : 'ok'
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membresía</h1>
        <p className="text-gray-500 mt-1">Tu plan y suscripción activa</p>
      </div>

      {/* Estado suscripción */}
      {suscripcion ? (
        <div className={`card border-2 ${
          urgencia === 'critica' ? 'border-red-300 bg-red-50' :
          urgencia === 'alta'    ? 'border-orange-300 bg-orange-50' :
          urgencia === 'media'   ? 'border-yellow-300 bg-yellow-50' :
          'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className={`w-5 h-5 ${urgencia === 'critica' ? 'text-red-500' : 'text-green-500'}`} />
                <h2 className="font-bold text-lg text-gray-900">Plan {suscripcion.plan_nombre}</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  suscripcion.estado === 'PRUEBA'  ? 'bg-blue-100 text-blue-700' :
                  suscripcion.estado === 'ACTIVA'  ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{suscripcion.estado}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Vence: {new Date(suscripcion.fecha_fin).toLocaleDateString('es-HN')}
                </span>
              </div>
            </div>
            <div className={`text-center ${urgencia === 'critica' ? 'text-red-600' : urgencia === 'alta' ? 'text-orange-600' : 'text-green-600'}`}>
              <p className="text-4xl font-bold">{diasRestantes}</p>
              <p className="text-sm font-medium">días restantes</p>
            </div>
          </div>

          {urgencia !== 'ok' && (
            <div className={`mt-4 pt-4 border-t flex items-center gap-2 text-sm ${
              urgencia === 'critica' ? 'text-red-600 border-red-200' :
              urgencia === 'alta'    ? 'text-orange-600 border-orange-200' :
              'text-yellow-700 border-yellow-200'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {urgencia === 'critica'
                ? 'Tu membresía vence en menos de 3 días. Renueva ahora para no perder acceso.'
                : 'Tu membresía vence pronto. Contáctanos para renovar.'}
            </div>
          )}
        </div>
      ) : (
        <div className="card border-orange-200 bg-orange-50 text-center py-8">
          <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-2" />
          <p className="font-semibold text-orange-800">Sin suscripción activa</p>
          <p className="text-sm text-orange-600 mt-1">Contáctanos para activar tu plan</p>
        </div>
      )}

      {/* Comparación de planes */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">Planes disponibles</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {planes.map(plan => {
            const esActual = suscripcion?.plan_codigo === plan.codigo;
            return (
              <div key={plan.id} className={`card relative ${esActual ? 'border-orange-400 shadow-md' : ''}`}>
                {esActual && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Tu plan actual
                  </div>
                )}
                <div className="text-center mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{plan.nombre}</h3>
                  <p className="text-3xl font-bold text-orange-500 mt-1">
                    L {Number(plan.precio).toLocaleString('es-HN')}
                    <span className="text-sm text-gray-400 font-normal">/mes</span>
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  {[
                    [`${plan.max_usuarios > 0 ? plan.max_usuarios : '∞'} usuario${plan.max_usuarios !== 1 ? 's' : ''}`, true],
                    [`${plan.max_sucursales > 0 ? plan.max_sucursales : '∞'} sucursal${plan.max_sucursales !== 1 ? 'es' : ''}`, true],
                    [`${plan.max_ofertas_mes > 0 ? plan.max_ofertas_mes : 'Ilimitadas'} ofertas/mes`, true],
                    ['Catálogo de productos', !!plan.tiene_catalogo],
                    ['Inventario', !!plan.tiene_inventario],
                    ['Reportes avanzados', !!plan.tiene_reportes],
                    ['Prioridad en solicitudes', !!plan.prioridad_solicitudes],
                  ].map(([label, tiene], i) => (
                    <li key={i} className={`flex items-center gap-2 ${tiene ? 'text-gray-700' : 'text-gray-300'}`}>
                      {tiene
                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        : <XCircle    className="w-4 h-4 text-gray-200 shrink-0" />
                      }
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">
          Para cambiar de plan o renovar, contáctanos en <span className="text-orange-500">hola@sabueso.hn</span>
        </p>
      </div>
    </div>
  );
}
