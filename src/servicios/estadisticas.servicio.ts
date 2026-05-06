import api from './api';
import { Estadisticas, EstadisticasRango } from '../tipos';

export const estadisticasServicio = {
  obtenerResumen: async (walletId: number): Promise<Estadisticas> => {
    const { data } = await api.get<Estadisticas>('/estadisticas', { params: { walletId } });
    return data;
  },

  obtenerResumenRango: async (
    walletId: number,
    desde: string,
    hasta: string,
  ): Promise<EstadisticasRango> => {
    const { data } = await api.get<EstadisticasRango>('/estadisticas/rango', {
      params: { walletId, desde, hasta },
    });
    return data;
  },
};
