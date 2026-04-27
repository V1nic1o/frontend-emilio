import api from './api';
import { Estadisticas } from '../tipos';

export const estadisticasServicio = {
  obtenerResumen: async (walletId: number): Promise<Estadisticas> => {
    const { data } = await api.get<Estadisticas>('/estadisticas', { params: { walletId } });
    return data;
  },
};
