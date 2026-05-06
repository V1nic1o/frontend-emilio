import api from './api';

export interface PerfilEmpresa {
  walletId: number;
  nombreEmpresa: string | null;
  logoBase64: string | null;
  /** URL HTTPS del logo (p. ej. Cloudinary); preferida en PDFs y en la app. */
  logoUrl: string | null;
  /** Solo servidor; no hace falta enviarlo desde la app. */
  logoCloudinaryPublicId?: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  nit: string | null;
}

export type ActualizarPerfilPayload = Partial<Omit<PerfilEmpresa, 'walletId' | 'logoCloudinaryPublicId'>> & {
  eliminarLogo?: boolean;
};

export const perfilServicio = {
  obtener: async (walletId: number): Promise<PerfilEmpresa> => {
    const { data } = await api.get<PerfilEmpresa>('/perfil', { params: { walletId } });
    return data;
  },

  actualizar: async (walletId: number, dto: ActualizarPerfilPayload): Promise<PerfilEmpresa> => {
    const { data } = await api.patch<PerfilEmpresa>('/perfil', dto, { params: { walletId } });
    return data;
  },
};
