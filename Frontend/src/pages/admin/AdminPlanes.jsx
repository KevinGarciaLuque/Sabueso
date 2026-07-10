import { useQuery } from '@tanstack/react-query';
import { catalogoApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AdminPlanes() {
  const { data: planes = [], isLoading } = useQuery({
    queryKey: ['planes'],
    queryFn: () => catalogoApi.planes().then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Planes de membresía</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planes.map(p => (
          <div key={p.id} className="card border-2 hover:border-orange-300 transition-colors">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">{p.nombre}</h2>
              <p className="text-3xl font-bold text-orange-500 mt-2">
                L {Number(p.precio).toLocaleString('es-HN')}
                <span className="text-base font-normal text-gray-400">/{p.periodo}</span>
              </p>
              {p.descripcion && <p className="text-sm text-gray-500 mt-2">{p.descripcion}</p>}
            </div>

            <ul className="space-y-2 text-sm">
              <Feature ok label={`${p.max_usuarios === 0 ? 'Ilimitados' : p.max_usuarios} usuario${p.max_usuarios !== 1 ? 's' : ''}`} />
              <Feature ok label={`${p.max_sucursales === 0 ? 'Ilimitadas' : p.max_sucursales} sucursal${p.max_sucursales !== 1 ? 'es' : ''}`} />
              <Feature ok label={p.max_ofertas_mes === 0 ? 'Ofertas ilimitadas' : `${p.max_ofertas_mes} ofertas/mes`} />
              <Feature ok={!!p.tiene_catalogo}  label="Catálogo de productos" />
              <Feature ok={!!p.tiene_inventario} label="Control de inventario" />
              <Feature ok={!!p.tiene_reportes}  label="Reportes y estadísticas" />
              <Feature ok={!!p.tiene_api}       label="Acceso a API" />
              <Feature ok={!!p.prioridad_solicitudes} label="Prioridad en solicitudes" />
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Feature({ ok, label }) {
  return (
    <li className="flex items-center gap-2">
      {ok
        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        : <XCircle    className="w-4 h-4 text-gray-300 shrink-0" />}
      <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </li>
  );
}
