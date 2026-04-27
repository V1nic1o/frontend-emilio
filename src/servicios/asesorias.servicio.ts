import api from './api';
import {
  ActualizarAsesoriaDto,
  AsesoriaPendienteResumen,
  AsesoriaPorPersonaRespuesta,
  CrearAsesoriaDto,
} from '../tipos';

export const asesoriasServicio = {
  listarPendientes: async (walletId: number): Promise<AsesoriaPendienteResumen[]> => {
    const { data } = await api.get<AsesoriaPendienteResumen[]>('/asesorias/pendientes', {
      params: { walletId },
    });
    return data;
  },

  sincronizar: async (walletId: number): Promise<{ sincronizadas: number; anio: number; mes: number }> => {
    const { data } = await api.post('/asesorias/sincronizar', null, { params: { walletId } });
    return data;
  },

  obtenerPorPersona: async (
    personaId: number,
    walletId: number,
  ): Promise<AsesoriaPorPersonaRespuesta> => {
    const { data } = await api.get<AsesoriaPorPersonaRespuesta>(`/asesorias/persona/${personaId}`, {
      params: { walletId },
    });
    return data;
  },

  crear: async (dto: CrearAsesoriaDto): Promise<AsesoriaPorPersonaRespuesta> => {
    const { data } = await api.post<AsesoriaPorPersonaRespuesta>('/asesorias', dto);
    return data;
  },

  actualizar: async (
    suscripcionId: number,
    walletId: number,
    dto: ActualizarAsesoriaDto,
  ): Promise<AsesoriaPorPersonaRespuesta> => {
    const { data } = await api.patch<AsesoriaPorPersonaRespuesta>(`/asesorias/${suscripcionId}`, dto, {
      params: { walletId },
    });
    return data;
  },

  desactivar: async (suscripcionId: number, walletId: number): Promise<AsesoriaPorPersonaRespuesta> => {
    const { data } = await api.post<AsesoriaPorPersonaRespuesta>(
      `/asesorias/${suscripcionId}/desactivar`,
      {},
      { params: { walletId } },
    );
    return data;
  },

  activar: async (suscripcionId: number, walletId: number): Promise<AsesoriaPorPersonaRespuesta> => {
    const { data } = await api.post<AsesoriaPorPersonaRespuesta>(
      `/asesorias/${suscripcionId}/activar`,
      {},
      { params: { walletId } },
    );
    return data;
  },

  marcarPagada: async (
    cobroId: number,
    walletId: number,
    fechaPago?: string,
  ): Promise<AsesoriaPorPersonaRespuesta> => {
    const { data } = await api.post<AsesoriaPorPersonaRespuesta>(
      `/asesorias/cobros/${cobroId}/marcar-pagada`,
      fechaPago ? { fechaPago } : {},
      { params: { walletId } },
    );
    return data;
  },

  eliminar: async (suscripcionId: number, walletId: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/asesorias/${suscripcionId}`, {
      params: { walletId },
    });
    return data;
  },
};
