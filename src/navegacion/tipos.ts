import { NavigatorScreenParams } from '@react-navigation/native';

// ─── Stack de autenticación ───────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Registro: undefined;
};

// ─── Stacks de wallet (pantallas pre-app) ────────────────────────────────────

export type WalletStackParamList = {
  SeleccionarWallet: undefined;
  CrearWallet: undefined;
};

// ─── Stacks internos por tab ──────────────────────────────────────────────────

export type InicioStackParamList = {
  Inicio: undefined;
  /** Listado de periodos de asesoría pendientes; se abre desde Inicio cuando hay más de uno. */
  AsesoriasPendientesCobro: undefined;
  /** Compras y pagos a proveedor en ventas con saldo pendiente. */
  PedidosPorPagar: undefined;
  /** Pedidos + asesorías que cuentan en «Sin saldar». */
  PendientesSinSaldar: undefined;
  /** Ventas por cobrar + asesorías pendientes (reemplaza el diálogo de la tarjeta «Por cobrar»). */
  PorCobrarDetalle: undefined;
  /** Desglose del mes en curso (misma info que la tarjeta «Este mes» en Inicio). */
  DetalleGananciaMes: undefined;
};

export type PersonasStackParamList = {
  ListaPersonas: undefined;
  CrearPersona: undefined;
  DetallePersona: { personaId: number };
  /** Pantalla completa de asesoría mensual; se abre desde el detalle del cliente. */
  AsesoriaMensual: { personaId: number; personaNombre?: string; personaNit?: string | null };
  DetallePedido: { pedidoId: number };
  CrearPedido: { personaId?: number };
};

export type PedidosStackParamList = {
  ListaPedidos: undefined;
  CrearPedido: { personaId?: number };
  DetallePedido: { pedidoId: number };
};

export type GastosStackParamList = {
  ListaGastos: undefined;
  CrearGasto: undefined;
  EditarGasto: { gastoId: number };
};

export type CatalogoStackParamList = {
  /** `limpiarSeleccion` lo envía la pantalla de revisión al volver tras agregar al carrito. */
  CatalogoProductos: { limpiarSeleccion?: true } | undefined;
  FormProducto: { productoId?: number };
  /** Revisión de ítems elegidos en modo «Armar pedido» antes de sumarlos al carrito. */
  AgregarSeleccionCatalogo: { productoIds: number[] };
};

export type EmpresaStackParamList = {
  MiEmpresa: undefined;
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export type TabParamList = {
  InicioTab: NavigatorScreenParams<InicioStackParamList> | undefined;
  PersonasTab: NavigatorScreenParams<PersonasStackParamList> | undefined;
  PedidosTab: NavigatorScreenParams<PedidosStackParamList> | undefined;
  CatalogoTab: NavigatorScreenParams<CatalogoStackParamList> | undefined;
  MasTab: undefined;
};

// ─── Workspace personal (tabs alternativos) ─────────────────────────────────

export type InicioPersonalStackParamList = {
  InicioPersonal: undefined;
};

export type IngresosPersonalStackParamList = {
  ListaIngresosPersonales: undefined;
  CrearIngresoPersonal: undefined;
  EditarIngresoPersonal: { ingresoId: number };
};

export type DeudasPersonalStackParamList = {
  ListaDeudasPersonales: undefined;
  CrearDeudaPersonal: undefined;
  EditarDeudaPersonal: { deudaId: number };
};

export type AhorrosPersonalStackParamList = {
  ListaAhorrosPersonales: undefined;
  CrearAhorroPersonal: undefined;
  EditarAhorroPersonal: { ahorroId: number };
};

export type TabParamListPersonal = {
  InicioPersonalTab: NavigatorScreenParams<InicioPersonalStackParamList> | undefined;
  IngresosPersonalTab: NavigatorScreenParams<IngresosPersonalStackParamList> | undefined;
  GastosPersonalTab: NavigatorScreenParams<GastosStackParamList> | undefined;
  DeudasPersonalTab: NavigatorScreenParams<DeudasPersonalStackParamList> | undefined;
  AhorrosPersonalTab: NavigatorScreenParams<AhorrosPersonalStackParamList> | undefined;
  MasPersonalTab: undefined;
};
