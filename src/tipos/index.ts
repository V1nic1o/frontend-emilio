export type TipoPersona = 'cliente' | 'proveedor';
export type TipoPedido = 'compra' | 'venta';
export type TipoItem = 'bien' | 'servicio';
export type EstadoPedido = 'pendiente' | 'parcial' | 'pagado';

export interface Persona {
  id: number;
  nombre: string;
  tipo: TipoPersona;
  createdAt: string;
  pedidos?: Pedido[];
}

export interface ResumenPedido {
  totalCompra: number;
  totalVenta: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoPedido;
}

export interface ItemPedido {
  id: number;
  pedidoId: number;
  tipo: TipoItem;
  nombre: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
}

export interface Pago {
  id: number;
  pedidoId: number;
  monto: number;
  fecha: string;
}

export interface Pedido {
  id: number;
  personaId: number;
  tipo: TipoPedido;
  fecha: string;
  createdAt: string;
  persona?: Persona;
  items?: ItemPedido[];
  pagos?: Pago[];
  resumen?: ResumenPedido;
}

export interface Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria?: string;
}

export interface CrearPersonaDto {
  nombre: string;
  tipo: TipoPersona;
}

export interface CrearItemDto {
  tipo: TipoItem;
  nombre: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
}

export interface CrearPagoDto {
  monto: number;
  fecha?: string;
}

export interface CrearPedidoDto {
  personaId: number;
  tipo: TipoPedido;
  fecha?: string;
  items: CrearItemDto[];
  pagoInicial?: CrearPagoDto;
}

export interface CrearGastoDto {
  descripcion: string;
  monto: number;
  fecha?: string;
  categoria?: string;
}

export interface MesEstadistica {
  mes: string;
  anio: number;
  ingresos: number;
  costoVentas: number;
  ganancia: number;
  gastos: number;
  gananciaNeta: number;
}

export interface Estadisticas {
  totalIngresos: number;
  totalCostoVentas: number;
  gananciaBruta: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  cantidadCompras: number;
  porMes: MesEstadistica[];
}
