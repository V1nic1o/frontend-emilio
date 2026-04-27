import api from './api';
import { Producto, CrearProductoDto, ActualizarProductoDto } from '../tipos';

export const productosServicio = {
  listarPorWallet: async (walletId: number): Promise<Producto[]> => {
    const { data } = await api.get<Producto[]>('/productos', { params: { walletId } });
    return data;
  },

  crear: async (dto: CrearProductoDto): Promise<Producto> => {
    const { data } = await api.post<Producto>('/productos', dto);
    return data;
  },

  actualizar: async (id: number, dto: ActualizarProductoDto): Promise<Producto> => {
    const { data } = await api.patch<Producto>(`/productos/${id}`, dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/productos/${id}`);
  },
};
