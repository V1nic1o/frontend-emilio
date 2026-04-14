import api from './api';
import { Persona, CrearPersonaDto } from '../tipos';

export const personasServicio = {
  listar: async (): Promise<Persona[]> => {
    const { data } = await api.get<Persona[]>('/personas');
    return data;
  },

  obtenerPorId: async (id: number): Promise<Persona> => {
    const { data } = await api.get<Persona>(`/personas/${id}`);
    return data;
  },

  crear: async (dto: CrearPersonaDto): Promise<Persona> => {
    const { data } = await api.post<Persona>('/personas', dto);
    return data;
  },
};
