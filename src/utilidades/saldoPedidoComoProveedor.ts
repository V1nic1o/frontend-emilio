import { PedidoComoProveedor } from '../tipos';

function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type VarianteLineaPedidoProveedor =
  | 'legado_sin_cliente'
  | 'intermediacion'
  | 'costo_venta_cliente'
  | 'fallback';

export type LineaSaldoPedidoComoProveedor = {
  totalMostrar: number;
  saldo: number;
  estaPagado: boolean;
  variante: VarianteLineaPedidoProveedor;
};

/**
 * Totales y montos para listados de persona. En intermediación, el saldo secundario
 * es `resumen.saldoPendiente` (mismo criterio que el saldo principal en el detalle del pedido).
 */
export function lineaSaldoPedidoComoProveedor(item: PedidoComoProveedor): LineaSaldoPedidoComoProveedor {
  const r = item.resumen;
  const esLegadoSinCliente =
    item.tipo === 'venta' &&
    (item.personaId == null || item.personaId === undefined) &&
    item.esIntermediacion !== true;

  if (esLegadoSinCliente && r) {
    const saldo = redondear2(r.saldoPendiente);
    return {
      totalMostrar: redondear2(r.totalVenta),
      saldo,
      estaPagado: saldo <= 0.005,
      variante: 'legado_sin_cliente',
    };
  }

  const esInter = item.tipo === 'venta' && item.esIntermediacion === true;
  if (esInter && r) {
    const saldo = redondear2(r.saldoPendiente);
    return {
      totalMostrar: redondear2(r.totalVenta),
      saldo,
      estaPagado: saldo <= 0.005,
      variante: 'intermediacion',
    };
  }

  if (item.tipo === 'venta' && r) {
    const saldo = redondear2(r.saldoProveedor);
    return {
      totalMostrar: redondear2(r.totalCompra),
      saldo,
      estaPagado: saldo <= 0.005,
      variante: 'costo_venta_cliente',
    };
  }

  const totalCompra = (item.items ?? []).reduce((s, i) => s + i.cantidad * i.precioCompra, 0);
  const totalPagado = (item.pagosProveedor ?? [])
    .filter((p) => (p.tipo ?? 'pago') !== 'ingreso_cliente_a_proveedor')
    .reduce((s, p) => s + p.monto, 0);
  const saldo = Math.max(0, redondear2(totalCompra - totalPagado));
  return {
    totalMostrar: redondear2(totalCompra),
    saldo,
    estaPagado: saldo <= 0.005,
    variante: 'fallback',
  };
}
