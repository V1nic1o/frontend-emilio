import api from './api';
import { DesgloseMes, Estadisticas, EstadisticasRango, HistorialMesContableItem } from '../tipos';

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

  obtenerHistorialMeses: async (walletId: number): Promise<{ meses: HistorialMesContableItem[] }> => {
    const { data } = await api.get<{ meses: HistorialMesContableItem[] }>('/estadisticas/historial-meses', {
      params: { walletId },
    });
    return data;
  },

  obtenerDesgloseMes: async (walletId: number, anio: number, mes: number): Promise<DesgloseMes> => {
    const { data } = await api.get<DesgloseMes>('/estadisticas/desglose-mes', {
      params: { walletId, anio, mes },
    });
    return data;
  },
};
