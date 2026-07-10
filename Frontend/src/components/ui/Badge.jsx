export function Badge({ children, variant = 'gray' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function UrgenciaBadge({ urgencia }) {
  const map = { BAJA:'gray', MEDIA:'blue', ALTA:'orange', CRITICA:'red' };
  const labels = { BAJA:'Baja', MEDIA:'Media', ALTA:'Alta', CRITICA:'Crítica' };
  return <Badge variant={map[urgencia] || 'gray'}>{labels[urgencia] || urgencia}</Badge>;
}

export function EstadoBadge({ estado }) {
  const map = {
    BORRADOR:'gray', PUBLICADA:'blue', RECIBIENDO_OFERTAS:'orange',
    OFERTA_SELECCIONADA:'green', COMPLETADA:'green', CANCELADA:'gray',
    EXPIRADA:'red', EN_NEGOCIACION:'yellow',
  };
  const labels = {
    BORRADOR:'Borrador', PUBLICADA:'Publicada', RECIBIENDO_OFERTAS:'Recibiendo ofertas',
    OFERTA_SELECCIONADA:'Oferta seleccionada', COMPLETADA:'Completada',
    CANCELADA:'Cancelada', EXPIRADA:'Expirada', EN_NEGOCIACION:'En negociación',
  };
  return <Badge variant={map[estado] || 'gray'}>{labels[estado] || estado}</Badge>;
}
