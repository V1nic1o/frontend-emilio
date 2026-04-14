import api from './api';
import { Estadisticas } from '../tipos';

export const estadisticasServicio = {
  obtenerResumen: async (): Promise<Estadisticas> => {
    const { data } = await api.get<Estadisticas>('/estadisticas');
    return data;
  },
};
