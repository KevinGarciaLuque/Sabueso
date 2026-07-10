import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, tiendasApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import {
  Store, Clock, DollarSign, CreditCard, FileText, Tag, Flag, Users, TrendingUp,
} from 'lucide-react';

const COLOR_CLASSES = {
  green:  'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  blue:   'bg-blue-100 text-blue-600',
  orange: 'bg-orange-100 text-orange-600',
  red:    'bg-red-100 text-red-600',
  gray:   'bg-gray-100 text-gray-600',
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then(r => r.data.data),
  });

  const { data: pendientes, isLoading: loadingPendientes } = useQuery({
    queryKey: ['tiendas-pendientes'],
    queryFn: () => tiendasApi.listarAdmin({ estado: 'PENDIENTE', limit: 5 }).then(r => r.data),
  });

  if (isLoading || loadingPendientes) return <PageLoader />;

  const s = data?.stats || {};

  const tiles = [
    { label: 'Tiendas verificadas',   value: s.tiendas_verificadas,  icon: Store,      color: 'green',  to: '/admin/tiendas?estado=VERIFICADA' },
    { label: 'Tiendas pendientes',    value: s.tiendas_pendientes,   icon: Clock,      color: 'yellow', to: '/admin/tiendas?estado=PENDIENTE' },
    { label: 'MRR',                   value: `L ${Number(s.mrr || 0).toLocaleString('es-HN')}`, icon: DollarSign, color: 'green' },
    { label: 'Membresías activas',    value: s.membresias_activas,   icon: CreditCard, color: 'blue',   to: '/admin/membresias' },
    { label: 'Solicitudes activas',   value: s.solicitudes_activas,  icon: FileText,   color: 'blue',   to: '/admin/solicitudes' },
    { label: 'Solicitudes hoy',       value: s.solicitudes_hoy,      icon: TrendingUp, color: 'orange' },
    { label: 'Ofertas hoy',           value: s.ofertas_hoy,          icon: Tag,        color: 'orange' },
    { label: 'Reportes abiertos',     value: s.reportes_abiertos,    icon: Flag,       color: 'red',    to: '/admin/reportes?estado=ABIERTO' },
  ];

  const secundarias = [
    { label: 'Clientes registrados', value: s.total_clientes, icon: Users },
    { label: 'Ofertas totales',      value: s.total_ofertas,  icon: Tag },
    { label: 'Promedio ofertas / solicitud', value: Number(s.avg_ofertas || 0).toFixed(1), icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel administrativo</h1>
        <p className="text-gray-500 mt-1">Vista general del sistema Sabueso</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => <StatTile key={t.label} {...t} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Actividad semanal</h2>
          <p className="text-xs text-gray-400 mb-2">Solicitudes publicadas por semana (últimas 8 semanas)</p>
          {data?.actividadSemanal?.length ? (
            <ActividadChart data={data.actividadSemanal} />
          ) : (
            <p className="text-center text-gray-400 py-10 text-sm">Sin datos suficientes</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribución de planes</h2>
          {data?.planesDist?.length ? (
            <RankedList items={data.planesDist} labelKey="nombre" valueKey="total" />
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">Sin membresías activas</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ciudades con más solicitudes</h2>
          {data?.ciudades?.length ? (
            <RankedList items={data.ciudades} labelKey="ciudad" valueKey="total" />
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">Sin datos</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Repuestos más solicitados</h2>
          {data?.repuestos?.length ? (
            <RankedList items={data.repuestos} labelKey="nombre_repuesto" valueKey="total" />
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">Sin datos</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {secundarias.map((t) => (
          <div key={t.label} className="card flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
              <t.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{t.value ?? 0}</p>
              <p className="text-xs text-gray-500">{t.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Tiendas pendientes de aprobación
          </h2>
          <Link to="/admin/tiendas?estado=PENDIENTE" className="text-sm text-orange-600">Ver todas →</Link>
        </div>

        {!pendientes?.data?.length ? (
          <p className="text-center text-gray-400 py-6">No hay tiendas pendientes</p>
        ) : (
          <div className="divide-y">
            {pendientes.data.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.nombre_comercial}</p>
                  <p className="text-sm text-gray-500">{t.email} · {new Date(t.creado_en).toLocaleDateString('es-HN')}</p>
                </div>
                <Link to={`/admin/tiendas/${t.id}`} className="btn-primary text-sm px-3 py-1.5">
                  Revisar
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color = 'gray', to }) {
  const content = (
    <div className="card hover:shadow-md transition-shadow flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${COLOR_CLASSES[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 truncate">{value ?? 0}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function ActividadChart({ data }) {
  const max = Math.max(1, ...data.map(d => Number(d.solicitudes)));
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {data.map((d) => {
        const pct = Math.max(4, (Number(d.solicitudes) / max) * 100);
        return (
          <div key={d.semana} className="flex-1 flex flex-col items-center h-full group">
            <div className="flex-1 w-full flex items-end justify-center relative">
              <span className="absolute -top-5 text-[10px] font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                {d.solicitudes}
              </span>
              <div className="w-full max-w-[28px] bg-orange-500 rounded-t-[4px] group-hover:bg-orange-600 transition-colors"
                style={{ height: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 mt-1.5 whitespace-nowrap">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RankedList({ items, labelKey, valueKey }) {
  const max = Math.max(1, ...items.map(i => Number(i[valueKey])));
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item[labelKey]} className="flex items-center gap-3">
          <span className="text-sm text-gray-700 w-28 truncate shrink-0">{item[labelKey]}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(Number(item[valueKey]) / max) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-500 tabular-nums w-8 text-right shrink-0">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
