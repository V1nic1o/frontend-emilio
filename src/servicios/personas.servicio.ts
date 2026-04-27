import api from './api';
import { Persona, CrearPersonaDto } from '../tipos';
import { TipoPersona } from '../tipos';

export interface ActualizarPersonaDto {
  nombre?: string;
  tipo?: TipoPersona;
  nit?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

export const personasServicio = {
  listar: async (walletId: number): Promise<Persona[]> => {
    const { data } = await api.get<Persona[]>('/personas', { params: { walletId } });
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

  actualizar: async (id: number, dto: ActualizarPersonaDto): Promise<Persona> => {
    const { data } = await api.patch<Persona>(`/personas/${id}`, dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/personas/${id}`);
  },
};
