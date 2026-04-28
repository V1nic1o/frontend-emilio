import { Pedido } from '../tipos';

/**
 * Venta sin cliente en la app: solo `proveedorId` (flujo «Venta proveedor»).
 * No confundir con venta a cliente con proveedor de costo opcional.
 */
export function esVentaSoloProveedorSinCliente(p: Pick<Pedido, 'tipo' | 'personaId' | 'persona' | 'proveedorId'>): boolean {
  return p.tipo === 'venta' && (p.personaId == null || p.personaId === undefined) && !!p.proveedorId;
}

/** Título en listas «por cobrar» cuando no hay persona cliente. */
export function tituloVentaParaListado(p: Pedido): string {
  const ref = p.nombreReferencia?.trim();
  if (ref) return ref;
  if (p.persona?.nombre?.trim()) return p.persona.nombre.trim();
  if (p.proveedor?.nombre?.trim()) return p.proveedor.nombre.trim();
  return 'Venta sin cliente';
}

/** Misma lógica que en Inicio: pedidos que aparecen en «Requieren pago» / «Sin saldar». */
export function pedidosRequierenAccionInicio(pedidos: Pedido[]): Pedido[] {
  return pedidos.filter(
    (p) =>
      p.resumen?.estado === 'pendiente' ||
      p.resumen?.estado === 'parcial' ||
      (p.tipo === 'venta' &&
        !!p.proveedorId &&
        !esVentaSoloProveedorSinCliente(p) &&
        (p.resumen?.estadoProveedor === 'pendiente' || p.resumen?.estadoProveedor === 'parcial')),
  );
}

/** Obligaciones de pago (compras al proveedor + pago proveedor en ventas). */
export type FilaPorPagar = {
  key: string;
  pedidoId: number;
  modo: 'compra_proveedor' | 'proveedor_en_venta';
  monto: number;
  nombreContexto: string;
  detalleLinea: string;
  fecha: string;
};

export function construirFilasPorPagar(pedidos: Pedido[]): FilaPorPagar[] {
  const out: FilaPorPagar[] = [];
  for (const p of pedidos) {
    if (p.tipo === 'compra') {
      const monto = p.resumen?.saldoPendiente ?? 0;
      if (monto > 0) {
        out.push({
          key: `${p.id}-compra`,
          pedidoId: p.id,
          modo: 'compra_proveedor',
          monto,
          nombreContexto: p.persona?.nombre ?? 'Proveedor',
          detalleLinea: 'Compra — pendiente con proveedor',
          fecha: p.fecha,
        });
      }
    }
    if (p.tipo === 'venta' && p.proveedorId && !esVentaSoloProveedorSinCliente(p)) {
      const monto = p.resumen?.saldoProveedor ?? 0;
      if (monto > 0) {
        out.push({
          key: `${p.id}-prov`,
          pedidoId: p.id,
          modo: 'proveedor_en_venta',
          monto,
          nombreContexto: p.proveedor?.nombre ?? 'Proveedor',
          detalleLinea: 'Venta — debés al proveedor',
          fecha: p.fecha,
        });
      }
    }
  }
  out.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  return out;
}

/** Ventas con saldo pendiente de cobro al cliente (misma base que el total «Por cobrar» de ventas en Inicio). */
export function ventasPorCobrarPendientes(pedidos: Pedido[]): { pedido: Pedido; saldo: number }[] {
  const out: { pedido: Pedido; saldo: number }[] = [];
  for (const p of pedidos) {
    if (p.tipo !== 'venta') continue;
    const total = p.resumen?.totalVenta ?? 0;
    const pagado = p.resumen?.totalPagado ?? 0;
    const saldo = Math.max(0, total - pagado);
    if (saldo > 0) out.push({ pedido: p, saldo });
  }
  out.sort((a, b) => new Date(b.pedido.fecha).getTime() - new Date(a.pedido.fecha).getTime());
  return out;
}
