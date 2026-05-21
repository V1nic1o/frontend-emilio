import { Pedido } from '../tipos';

/**
 * Solo dos modos de venta. Compras (`tipo === compra`) → `null` (no usar modo de venta).
 * Pedidos viejos sin `personaId` y con proveedor = **venta_proveedor** (canal proveedor).
 */
export type ModoPedidoNegocio = 'venta_cliente' | 'venta_proveedor';

export type PedidoParaModo = Pick<Pedido, 'tipo' | 'esIntermediacion' | 'personaId' | 'proveedorId'>;

export function modoPedidoNegocio(p: PedidoParaModo): ModoPedidoNegocio | null {
  if (p.tipo !== 'venta') return null;
  const sinPersonaCliente = p.personaId == null || p.personaId === undefined;
  if (p.esIntermediacion === true || (sinPersonaCliente && !!p.proveedorId)) {
    return 'venta_proveedor';
  }
  return 'venta_cliente';
}

export function esVentaClienteModo(modo: ModoPedidoNegocio | null): boolean {
  return modo === 'venta_cliente';
}

export function esVentaProveedorModo(modo: ModoPedidoNegocio | null): boolean {
  return modo === 'venta_proveedor';
}

/**
 * Venta con proveedor pero sin persona cliente en la app (solo lectura de datos viejos).
 */
export function esVentaSoloProveedorSinCliente(p: PedidoParaModo): boolean {
  return (
    p.tipo === 'venta' &&
    (p.personaId == null || p.personaId === undefined) &&
    !!p.proveedorId &&
    p.esIntermediacion !== true
  );
}

/**
 * Venta con cliente en la app y proveedor vinculado, sin intermediación:
 * cobros al cliente + costo / pagos al proveedor (modo `venta_cliente` con proveedor).
 */
export function esVentaClienteConProveedorCosto(p: PedidoParaModo): boolean {
  if (p.tipo !== 'venta' || !p.proveedorId) return false;
  const tieneCliente = p.personaId != null && p.personaId !== undefined;
  return tieneCliente && p.esIntermediacion !== true;
}
