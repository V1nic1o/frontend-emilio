import api from './api';
import { Gasto, CrearGastoDto } from '../tipos';

export const gastosServicio = {
  listar: async (): Promise<Gasto[]> => {
    const { data } = await api.get<Gasto[]>('/gastos');
    return data;
  },

  crear: async (dto: CrearGastoDto): Promise<Gasto> => {
    const { data } = await api.post<Gasto>('/gastos', dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/gastos/${id}`);
  },
};
