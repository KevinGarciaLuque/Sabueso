import { useQuery } from '@tanstack/react-query';
import { estadisticasApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';
import { TrendingUp, Tag, ShoppingBag, Star, CheckCircle, XCircle } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-50 text-orange-500',
    blue:   'bg-blue-50 text-blue-500',
    green:  'bg-green-50 text-green-500',
    purple: 'bg-purple-50 text-purple-500',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StoreStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['estadisticas-tienda'],
    queryFn: () => estadisticasApi.tienda().then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  const { stats, semanal = [], categorias = [] } = data || {};

  // Simple bar chart heights
  const maxOfertas = Math.max(...semanal.map(s => Number(s.ofertas)), 1);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-gray-500 mt-1">Rendimiento de tu tienda en Sabueso</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Tag}         label="Ofertas enviadas"   value={stats?.total_ofertas ?? 0}       color="orange" />
        <StatCard icon={CheckCircle} label="Ofertas aceptadas"  value={stats?.ofertas_aceptadas ?? 0}   color="green" />
        <StatCard icon={TrendingUp}  label="Tasa de conversión" value={`${stats?.tasa_conversion ?? 0}%`} color="blue" />
        <StatCard icon={ShoppingBag} label="Órdenes totales"    value={stats?.total_ordenes ?? 0}       color="purple" />
        <StatCard icon={ShoppingBag} label="Órdenes entregadas" value={stats?.ordenes_entregadas ?? 0}  color="green" />
        <StatCard icon={Star}        label="Calificación prom." value={stats?.promedio_calif ? Number(stats.promedio_calif).toFixed(1) : '—'} sub={`${stats?.total_calif ?? 0} reseñas`} color="orange" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfica semanal */}
        {semanal.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Ofertas últimas 8 semanas</h3>
            <div className="flex items-end gap-2 h-32">
              {semanal.map(s => {
                const h = Math.round((Number(s.ofertas) / maxOfertas) * 100);
                const ha = Math.round((Number(s.aceptadas) / maxOfertas) * 100);
                return (
                  <div key={s.semana} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: '100px' }}>
                      <div className="flex-1 bg-orange-200 rounded-t transition-all" style={{ height: `${h}%` }} />
                      <div className="flex-1 bg-orange-500 rounded-t transition-all" style={{ height: `${ha}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400">{s.semana_label}</p>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {s.ofertas} enviadas · {s.aceptadas} aceptadas
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-200 rounded" /> Enviadas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-500 rounded" /> Aceptadas</span>
            </div>
          </div>
        )}

        {/* Categorías top */}
        {categorias.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Categorías más atendidas</h3>
            <div className="space-y-3">
              {categorias.map((c, i) => {
                const pct = Math.round((c.total / categorias[0].total) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{c.nombre}</span>
                      <span className="text-gray-500 font-medium">{c.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
