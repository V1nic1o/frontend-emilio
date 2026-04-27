import api from './api';

export interface UsuarioAuth {
  id: number;
  email: string;
  nombre: string;
}

export interface RespuestaAuth {
  token: string;
  usuario: UsuarioAuth;
}

export const authServicio = {
  registrar: async (email: string, password: string, nombre: string): Promise<RespuestaAuth> => {
    const { data } = await api.post<RespuestaAuth>('/auth/registrar', { email, password, nombre });
    return data;
  },

  login: async (email: string, password: string): Promise<RespuestaAuth> => {
    const { data } = await api.post<RespuestaAuth>('/auth/login', { email, password });
    return data;
  },

  me: async (): Promise<UsuarioAuth> => {
    const { data } = await api.get<UsuarioAuth>('/auth/me');
    return data;
  },
};
