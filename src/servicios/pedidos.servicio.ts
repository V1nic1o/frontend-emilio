import api from './api';
import {
  Pedido,
  ItemPedido,
  CrearPedidoDto,
  ActualizarPedidoDto,
  CrearItemDto,
  ActualizarItemDto,
  CrearPagoDto,
  CrearPagoProveedorDto,
  Pago,
  PagoProveedor,
  ResumenPedido,
} from '../tipos';

interface RespuestaPago {
  pago: Pago;
  resumen: ResumenPedido;
}

interface RespuestaPagoProveedor {
  pago: PagoProveedor;
  resumen: ResumenPedido;
}

interface RespuestaItem {
  item: ItemPedido;
  resumen: ResumenPedido;
}

interface RespuestaEliminarItem {
  mensaje: string;
  resumen: ResumenPedido;
}

export const pedidosServicio = {
  listar: async (walletId: number): Promise<Pedido[]> => {
    const { data } = await api.get<Pedido[]>('/pedidos', { params: { walletId } });
    return data;
  },

  obtenerPorId: async (id: number): Promise<Pedido> => {
    const { data } = await api.get<Pedido>(`/pedidos/${id}`);
    return data;
  },

  crear: async (dto: CrearPedidoDto): Promise<Pedido> => {
    const { data } = await api.post<Pedido>('/pedidos', dto);
    return data;
  },

  actualizar: async (pedidoId: number, dto: ActualizarPedidoDto): Promise<Pedido> => {
    const { data } = await api.patch<Pedido>(`/pedidos/${pedidoId}`, dto);
    return data;
  },

  agregarPago: async (pedidoId: number, dto: CrearPagoDto): Promise<RespuestaPago> => {
    const { data } = await api.post<RespuestaPago>(`/pedidos/${pedidoId}/pagos`, dto);
    return data;
  },

  agregarPagoProveedor: async (pedidoId: number, dto: CrearPagoProveedorDto): Promise<RespuestaPagoProveedor> => {
    const { data } = await api.post<RespuestaPagoProveedor>(`/pedidos/${pedidoId}/pagos-proveedor`, dto);
    return data;
  },

  eliminarPago: async (pedidoId: number, pagoId: number): Promise<{ resumen: ResumenPedido }> => {
    const { data } = await api.delete<{ resumen: ResumenPedido }>(`/pedidos/${pedidoId}/pagos/${pagoId}`);
    return data;
  },

  eliminarPagoProveedor: async (pedidoId: number, pagoId: number): Promise<{ resumen: ResumenPedido }> => {
    const { data } = await api.delete<{ resumen: ResumenPedido }>(`/pedidos/${pedidoId}/pagos-proveedor/${pagoId}`);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/pedidos/${id}`);
  },

  // ─── Gestión de ítems individuales ────────────────────────────────────────

  agregarItem: async (pedidoId: number, dto: CrearItemDto): Promise<RespuestaItem> => {
    const { data } = await api.post<RespuestaItem>(`/pedidos/${pedidoId}/items`, dto);
    return data;
  },

  actualizarItem: async (pedidoId: number, itemId: number, dto: ActualizarItemDto): Promise<RespuestaItem> => {
    const { data } = await api.patch<RespuestaItem>(`/pedidos/${pedidoId}/items/${itemId}`, dto);
    return data;
  },

  eliminarItem: async (pedidoId: number, itemId: number): Promise<RespuestaEliminarItem> => {
    const { data } = await api.delete<RespuestaEliminarItem>(`/pedidos/${pedidoId}/items/${itemId}`);
    return data;
  },
};
