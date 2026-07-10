export const URGENCIA_BADGE = {
  BAJA:    'badge-gray',
  MEDIA:   'badge-blue',
  ALTA:    'badge-orange',
  CRITICA: 'badge-red',
};

export const ESTADO_SOLICITUD_BADGE = {
  BORRADOR:           'badge-gray',
  PUBLICADA:          'badge-blue',
  RECIBIENDO_OFERTAS: 'badge-orange',
  OFERTA_SELECCIONADA:'badge-green',
  EN_NEGOCIACION:     'badge-yellow',
  EN_PROCESO:         'badge-blue',
  COMPLETADA:         'badge-green',
  CANCELADA:          'badge-gray',
  EXPIRADA:           'badge-red',
};

export const TIPO_REPUESTO_LABEL = {
  ORIGINAL_OEM:    'Original OEM',
  ORIGINAL_USADO:  'Original usado',
  GENERICO_NUEVO:  'Genérico nuevo',
  REMANUFACTURADO: 'Remanufacturado',
  RECONSTRUIDO:    'Reconstruido',
  ALTERNATIVO:     'Alternativo',
  DESARMADERO:     'Desarmadero',
};

export const CONDICION_LABEL = {
  NUEVO:              'Nuevo',
  USADO:              'Usado',
  COMO_NUEVO:         'Como nuevo',
  REPARADO:           'Reparado',
  CON_DETALLES:       'Con detalles',
  PARA_RECONSTRUCCION:'Para reconstrucción',
};

export const DISPONIBILIDAD_LABEL = {
  INMEDIATA:  'Inmediata',
  '1_DIA':    '1 día',
  '2_3_DIAS': '2-3 días',
  '1_SEMANA': '1 semana',
  A_PEDIDO:   'A pedido',
};

export const TIPO_REPORTE_LABEL = {
  SPAM:               'Spam',
  PRECIO_INCORRECTO:  'Precio incorrecto',
  OFERTA_FALSA:       'Oferta falsa',
  MALA_ATENCION:      'Mala atención',
  FRAUDE:             'Fraude',
  OTRO:               'Otro',
};

export const ESTADO_REPORTE_BADGE = {
  ABIERTO:      'red',
  EN_REVISION:  'yellow',
  RESUELTO:     'green',
  DESCARTADO:   'gray',
};

export const ESTADO_REPORTE_LABEL = {
  ABIERTO:      'Abierto',
  EN_REVISION:  'En revisión',
  RESUELTO:     'Resuelto',
  DESCARTADO:   'Descartado',
};

export const ROLES = {
  SUPER_ADMIN:     'SUPER_ADMIN',
  ADMIN_SOPORTE:   'ADMIN_SOPORTE',
  ADMIN_COMERCIAL: 'ADMIN_COMERCIAL',
  MODERADOR:       'MODERADOR',
  PROPIETARIO:     'PROPIETARIO',
  ADMINISTRADOR:   'ADMINISTRADOR',
  VENDEDOR:        'VENDEDOR',
  CLIENTE:         'CLIENTE',
  MECANICO:        'MECANICO',
  TALLER:          'TALLER',
  EMPRESA:         'EMPRESA',
};

export const isPlatformAdmin = (tipo) =>
  ['SUPER_ADMIN','ADMIN_SOPORTE','ADMIN_COMERCIAL','MODERADOR'].includes(tipo);

export const isStoreUser = (tipo) =>
  ['PROPIETARIO','ADMINISTRADOR','VENDEDOR','BODEGA','CAJERO','REPARTIDOR'].includes(tipo);

export const isClient = (tipo) =>
  ['CLIENTE','MECANICO','TALLER','EMPRESA'].includes(tipo);
