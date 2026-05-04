export type TipoPersona = 'cliente' | 'proveedor';
export type TipoPedido = 'compra' | 'venta';
export type TipoItem = 'bien' | 'servicio';
export type EstadoPedido = 'pendiente' | 'parcial' | 'pagado';

// ─── Wallet ───────────────────────────────────────────────────────────────────

export type TipoWallet = 'empresa' | 'personal';

export interface Wallet {
  id: number;
  nombre: string;
  descripcion?: string;
  color: string;
  /** Ausente en clientes antiguos; se asume `empresa`. */
  tipo?: TipoWallet;
  createdAt: string;
}

export interface CrearWalletDto {
  nombre: string;
  descripcion?: string;
  color?: string;
  tipo?: TipoWallet;
}

export interface ActualizarWalletDto {
  nombre?: string;
  descripcion?: string;
  color?: string;
}

// ─── Finanzas personales (workspace `personal`) ─────────────────────────────

export interface ResumenFinanzasPersonales {
  totalIngresosMes: number;
  totalGastosMes: number;
  balanceMes: number;
  deudasPendientesTotal: number;
  cantidadDeudas: number;
  totalAhorrado: number;
  cantidadMetasAhorro: number;
}

export interface IngresoPersonal {
  id: number;
  walletId: number;
  descripcion: string;
  monto: number;
  fecha: string;
  createdAt: string;
}

export interface CrearIngresoPersonalDto {
  walletId: number;
  descripcion: string;
  monto: number;
  fecha?: string;
}

export interface ActualizarIngresoPersonalDto {
  descripcion?: string;
  monto?: number;
  fecha?: string;
}

export interface DeudaPersonal {
  id: number;
  walletId: number;
  titulo: string;
  montoOriginal: number;
  montoPagado: number;
  fecha: string;
  notas: string | null;
}

export interface CrearDeudaPersonalDto {
  walletId: number;
  titulo: string;
  montoOriginal: number;
  fecha?: string;
  notas?: string;
}

export interface ActualizarDeudaPersonalDto {
  titulo?: string;
  montoOriginal?: number;
  montoPagado?: number;
  fecha?: string;
  notas?: string;
}

export interface AhorroPersonal {
  id: number;
  walletId: number;
  nombre: string;
  metaMonto: number | null;
  montoActual: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrearAhorroPersonalDto {
  walletId: number;
  nombre: string;
  metaMonto?: number;
  montoActual?: number;
}

export interface ActualizarAhorroPersonalDto {
  nombre?: string;
  metaMonto?: number | null;
  montoActual?: number;
}

// ─── Producto (catálogo) ───────────────────────────────────────────────────────

export interface Producto {
  id: number;
  walletId: number;
  nombre: string;
  tipo: TipoItem;
  precioProveedor: number;
  precioEmpresa: number;
  createdAt: string;
}

export interface CrearProductoDto {
  walletId: number;
  nombre: string;
  tipo?: TipoItem;
  precioProveedor: number;
  precioEmpresa: number;
}

export interface ActualizarProductoDto {
  nombre?: string;
  tipo?: TipoItem;
  precioProveedor?: number;
  precioEmpresa?: number;
}

// ─── Persona ──────────────────────────────────────────────────────────────────

export interface Persona {
  id: number;
  walletId?: number;
  nombre: string;
  tipo: TipoPersona;
  /** NIT u otro identificador fiscal (opcional). */
  nit?: string | null;
  direccion?: string;
  email?: string;
  telefono?: string;
  createdAt: string;
  pedidos?: Pedido[];
  pedidosProveedor?: PedidoComoProveedor[];
  /** Suma de `saldoProveedor` solo en ventas **con** cliente donde esta persona es `proveedorId`. */
  saldoCostoPendienteConProveedor?: number;
  /** Suma de `saldoPendiente` de venta sin cliente en app donde es `proveedorId` (te deben por esa venta). */
  saldoVentaPorCobrarComoProveedor?: number;
  pedidosProveedorCount?: number;
}

export interface PedidoComoProveedor {
  id: number;
  personaId?: number | null;
  tipo: TipoPedido;
  fecha: string;
  nombreReferencia?: string | null;
  impuesto?: number | null;
  persona?: { id: number; nombre: string; tipo: TipoPersona };
  items?: Pick<ItemPedido, 'id' | 'cantidad' | 'precioCompra' | 'precioVenta' | 'nombre' | 'tipo'>[];
  pagos?: Pago[];
  pagosProveedor?: PagoProveedor[];
  /** Presente en detalle de persona (API enriquecida). */
  resumen?: ResumenPedido;
}

export interface CrearPersonaDto {
  walletId: number;
  nombre: string;
  tipo: TipoPersona;
  nit?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

export interface ActualizarPersonaDto {
  nombre?: string;
  tipo?: TipoPersona;
  nit?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

// ─── Pedido ───────────────────────────────────────────────────────────────────

export interface ResumenPedido {
  // Lado cliente
  totalCompra: number;
  /** Suma ítems × precio venta (sin IVA). */
  subtotalVenta: number;
  /** IVA sobre subtotal en ventas con impuesto. */
  montoImpuestoVenta: number;
  /** Total a cobrar al cliente en venta (subtotal + IVA si aplica). */
  totalVenta: number;
  totalPagado: number;
  /** Tope del lado Pagos (venta normal: totalVenta; venta proveedor: margen venta−costo). */
  referenciaSaldoCliente: number;
  saldoPendiente: number;
  estado: EstadoPedido;
  // Lado proveedor
  totalPagadoProveedor: number;
  saldoProveedor: number;
  estadoProveedor: EstadoPedido;
}

export interface ItemPedido {
  id: number;
  pedidoId: number;
  productoId?: number;
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

export type TipoPagoProveedor = 'pago' | 'cobro' | 'ingreso_cliente_a_proveedor';

export interface PagoProveedor {
  id: number;
  pedidoId: number;
  monto: number;
  fecha: string;
  /** `pago`: le pagaste al proveedor. `cobro`: te pagó él (reduce costo). `ingreso_cliente_a_proveedor`: clientes pagaron a él (venta sin cliente). */
  tipo?: TipoPagoProveedor;
}

export interface Pedido {
  id: number;
  personaId?: number | null;
  proveedorId?: number;
  tipo: TipoPedido;
  nombreReferencia?: string | null;
  impuesto?: number;
  fecha: string;
  createdAt: string;
  persona?: Persona;
  proveedor?: Persona;
  items?: ItemPedido[];
  pagos?: Pago[];
  pagosProveedor?: PagoProveedor[];
  resumen?: ResumenPedido;
}

export interface CrearItemDto {
  productoId?: number;
  tipo: TipoItem;
  nombre: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
}

export interface ActualizarItemDto {
  tipo?: TipoItem;
  nombre?: string;
  cantidad?: number;
  precioCompra?: number;
  precioVenta?: number;
}

export interface CrearPagoDto {
  monto: number;
  fecha?: string;
}

export interface CrearPagoProveedorDto {
  monto: number;
  tipo?: TipoPagoProveedor;
  fecha?: string;
}

export interface CrearPedidoDto {
  personaId?: number;
  proveedorId?: number;
  tipo: TipoPedido;
  nombreReferencia?: string;
  impuesto?: number;
  fecha?: string;
  items: CrearItemDto[];
  pagoInicial?: CrearPagoDto;
}

/** PATCH /pedidos/:id — metadatos sin tocar ítems ni pagos */
export interface ActualizarPedidoDto {
  nombreReferencia?: string;
  impuesto?: number | null;
}

// ─── Asesoría mensual por cliente (API: asesorías) ───────────────────────────

export type EstadoAsesoriaCobro = 'pendiente' | 'pagada';

export interface AsesoriaCobro {
  id: number;
  suscripcionId: number;
  anio: number;
  mes: number;
  montoBase: number;
  montoIva: number;
  montoTotal: number;
  estado: EstadoAsesoriaCobro;
  fechaRegistro: string;
  fechaPago?: string | null;
}

export interface AsesoriaSuscripcion {
  id: number;
  personaId: number;
  montoMensual: number;
  impuestoPct: number | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
  cobros?: AsesoriaCobro[];
}

export interface AsesoriaPorPersonaRespuesta {
  suscripcion: (Omit<AsesoriaSuscripcion, 'cobros'> & { cobros: AsesoriaCobro[] }) | null;
}

export interface AsesoriaPendienteResumen {
  cobroId: number;
  personaId: number;
  personaNombre: string;
  suscripcionId: number;
  anio: number;
  mes: number;
  montoTotal: number;
  montoBase: number;
  montoIva: number;
}

export interface CrearAsesoriaDto {
  walletId: number;
  personaId: number;
  montoMensual: number;
  impuestoPct?: number | null;
}

export interface ActualizarAsesoriaDto {
  montoMensual?: number;
  impuestoPct?: number | null;
}

// ─── Gasto ────────────────────────────────────────────────────────────────────

export interface Gasto {
  id: number;
  walletId?: number;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria?: string;
}

export interface CrearGastoDto {
  walletId: number;
  descripcion: string;
  monto: number;
  fecha?: string;
  categoria?: string;
}

export interface ActualizarGastoDto {
  descripcion?: string;
  monto?: number;
  fecha?: string;
  categoria?: string;
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

export interface MesEstadistica {
  mes: string;
  anio: number;
  ingresos: number;
  /** IVA de ventas con impuesto en ese mes. */
  impuestosIva: number;
  costoVentas: number;
  ganancia: number;
  gastos: number;
  gananciaNeta: number;
  /** Cobrado en ventas del mes (opcional hasta actualizar API). */
  ingresosPedidos?: number;
  /** Cobros de asesoría pagados en el mes. */
  ingresosAsesorias?: number;
  /** Parte de la ganancia neta atribuida a pedidos (gastos prorrateados por margen). */
  gananciaNetaPedidos?: number;
  /** Parte de la ganancia neta atribuida a asesorías. */
  gananciaNetaAsesorias?: number;
}

export interface Estadisticas {
  totalIngresos: number;
  /** Suma de IVA en ventas con impuesto asignado. */
  totalImpuestosIva: number;
  totalCostoVentas: number;
  gananciaBruta: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  cantidadCompras: number;
  porMes: MesEstadistica[];
}
