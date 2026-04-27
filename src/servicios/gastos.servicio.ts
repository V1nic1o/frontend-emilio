import api from './api';
import { Gasto, CrearGastoDto, ActualizarGastoDto } from '../tipos';

export const gastosServicio = {
  listar: async (walletId: number): Promise<Gasto[]> => {
    const { data } = await api.get<Gasto[]>('/gastos', { params: { walletId } });
    return data;
  },

  crear: async (dto: CrearGastoDto): Promise<Gasto> => {
    const { data } = await api.post<Gasto>('/gastos', dto);
    return data;
  },

  actualizar: async (id: number, dto: ActualizarGastoDto): Promise<Gasto> => {
    const { data } = await api.patch<Gasto>(`/gastos/${id}`, dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/gastos/${id}`);
  },
};
