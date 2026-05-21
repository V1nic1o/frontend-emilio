import { Pedido } from '../tipos';
import { esVentaSoloProveedorSinCliente, modoPedidoNegocio } from './modoPedido';

export { esVentaSoloProveedorSinCliente };

/** Título en listas «por cobrar» cuando no hay persona cliente. */
export function tituloVentaParaListado(p: Pedido): string {
  const ref = p.nombreReferencia?.trim();
  if (ref) return ref;
  if (p.persona?.nombre?.trim()) return p.persona.nombre.trim();
  if (p.proveedor?.nombre?.trim()) return p.proveedor.nombre.trim();
  return 'Venta sin cliente';
}

/**
 * Nombre del cliente / contacto para una segunda línea bajo el título del pedido.
 * Evita repetir el mismo texto que `tituloVentaParaListado` cuando ya es el único rotulo.
 */
export function nombreClienteBajoTituloPedido(p: Pedido, tituloListado: string): string | null {
  const t = tituloListado.trim();
  const personaN = p.persona?.nombre?.trim();
  if (personaN) {
    return personaN === t ? null : personaN;
  }
  if (p.tipo === 'venta' && !p.persona) {
    const leg = p.nombreReferencia?.trim() || p.proveedor?.nombre?.trim() || 'Sin cliente';
    return leg === t ? null : leg;
  }
  return null;
}

/** Misma lógica que en Inicio: pedidos que aparecen en «Requieren pago» / «Sin saldar». */
export function pedidosRequierenAccionInicio(pedidos: Pedido[]): Pedido[] {
  return pedidos.filter(
    (p) =>
      p.resumen?.estado === 'pendiente' ||
      p.resumen?.estado === 'parcial' ||
      (modoPedidoNegocio(p) === 'venta_cliente' &&
        !!p.proveedorId &&
        (p.resumen?.estadoProveedor === 'pendiente' || p.resumen?.estadoProveedor === 'parcial')),
  );
}

/** Obligaciones de pago (pago proveedor en ventas cliente con costo). */
export type FilaPorPagar = {
  key: string;
  pedidoId: number;
  modo: 'proveedor_en_venta';
  monto: number;
  nombreContexto: string;
  detalleLinea: string;
  fecha: string;
};

export function construirFilasPorPagar(pedidos: Pedido[]): FilaPorPagar[] {
  const out: FilaPorPagar[] = [];
  for (const p of pedidos) {
    if (modoPedidoNegocio(p) === 'venta_cliente' && p.proveedorId) {
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

/** Ventas con saldo pendiente de cobro (usa `resumen.saldoPendiente` del API). */
export function ventasPorCobrarPendientes(pedidos: Pedido[]): { pedido: Pedido; saldo: number }[] {
  const out: { pedido: Pedido; saldo: number }[] = [];
  for (const p of pedidos) {
    if (p.tipo !== 'venta') continue;
    const saldo = p.resumen?.saldoPendiente ?? 0;
    if (saldo > 0) out.push({ pedido: p, saldo });
  }
  out.sort((a, b) => new Date(b.pedido.fecha).getTime() - new Date(a.pedido.fecha).getTime());
  return out;
}
