export const formatearMoneda = (valor: number): string => {
  const num = new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
  return `Q ${num}`;
};

export const formatearFecha = (fecha: string): string => {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatearFechaHora = (fecha: string): string => {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const obtenerMesActual = (): { inicio: Date; fin: Date } => {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
  return { inicio, fin };
};

export const esMesActual = (fecha: string): boolean => {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;
  const hoy = new Date();
  return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
};

export const parsearNumero = (texto: string): number => {
  // Eliminar todo excepto dígitos y punto decimal
  const limpio = texto.replace(/[^0-9.]/g, '');
  // Si hay múltiples puntos, quedarse solo con el primero (ej: "1.2.3" → "1.2")
  const primerPunto = limpio.indexOf('.');
  const normalizado =
    primerPunto === -1
      ? limpio
      : limpio.slice(0, primerPunto + 1) + limpio.slice(primerPunto + 1).replace(/\./g, '');
  const num = parseFloat(normalizado);
  return isNaN(num) ? 0 : num;
};

export const etiquetaTipoPersona = (tipo: string): string =>
  tipo === 'cliente' ? 'Cliente' : 'Proveedor';

export const etiquetaTipoPedido = (tipo: string): string =>
  tipo === 'venta' ? 'Venta' : 'Compra';

/** Título visible: referencia personalizada o "Venta/Compra #id". */
export const etiquetaPedido = (p: {
  id: number;
  tipo: string;
  nombreReferencia?: string | null;
}): string => {
  const ref = p.nombreReferencia?.trim();
  if (ref) return ref;
  return `${etiquetaTipoPedido(p.tipo)} #${p.id}`;
};

/** Línea secundaria con #id cuando hay nombre personalizado. */
export const subtituloNumeroPedido = (p: {
  id: number;
  tipo: string;
  nombreReferencia?: string | null;
}): string | null => {
  if (!p.nombreReferencia?.trim()) return null;
  return `${etiquetaTipoPedido(p.tipo)} · #${p.id}`;
};

export const etiquetaEstado = (estado: string): string => {
  switch (estado) {
    case 'pagado': return 'Pagado';
    case 'parcial': return 'Parcial';
    default: return 'Pendiente';
  }
};
