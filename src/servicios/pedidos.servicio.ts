import api from './api';
import { Pedido, CrearPedidoDto, CrearPagoDto, Pago, ResumenPedido } from '../tipos';

interface RespuestaPago {
  pago: Pago;
  resumen: ResumenPedido;
}

export const pedidosServicio = {
  listar: async (): Promise<Pedido[]> => {
    const { data } = await api.get<Pedido[]>('/pedidos');
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

  agregarPago: async (pedidoId: number, dto: CrearPagoDto): Promise<RespuestaPago> => {
    const { data } = await api.post<RespuestaPago>(`/pedidos/${pedidoId}/pagos`, dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/pedidos/${id}`);
  },
};
