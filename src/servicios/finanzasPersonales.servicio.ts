import api from './api';
import {
  ResumenFinanzasPersonales,
  IngresoPersonal,
  CrearIngresoPersonalDto,
  ActualizarIngresoPersonalDto,
  DeudaPersonal,
  CrearDeudaPersonalDto,
  ActualizarDeudaPersonalDto,
  AhorroPersonal,
  CrearAhorroPersonalDto,
  ActualizarAhorroPersonalDto,
} from '../tipos';

export const finanzasPersonalesServicio = {
  resumen: async (walletId: number): Promise<ResumenFinanzasPersonales> => {
    const { data } = await api.get<ResumenFinanzasPersonales>('/finanzas-personales/resumen', {
      params: { walletId },
    });
    return data;
  },

  listarIngresos: async (walletId: number): Promise<IngresoPersonal[]> => {
    const { data } = await api.get<IngresoPersonal[]>('/finanzas-personales/ingresos', { params: { walletId } });
    return data;
  },

  crearIngreso: async (dto: CrearIngresoPersonalDto): Promise<IngresoPersonal> => {
    const { data } = await api.post<IngresoPersonal>('/finanzas-personales/ingresos', dto);
    return data;
  },

  actualizarIngreso: async (id: number, dto: ActualizarIngresoPersonalDto): Promise<IngresoPersonal> => {
    const { data } = await api.patch<IngresoPersonal>(`/finanzas-personales/ingresos/${id}`, dto);
    return data;
  },

  eliminarIngreso: async (id: number): Promise<void> => {
    await api.delete(`/finanzas-personales/ingresos/${id}`);
  },

  listarDeudas: async (walletId: number): Promise<DeudaPersonal[]> => {
    const { data } = await api.get<DeudaPersonal[]>('/finanzas-personales/deudas', { params: { walletId } });
    return data;
  },

  crearDeuda: async (dto: CrearDeudaPersonalDto): Promise<DeudaPersonal> => {
    const { data } = await api.post<DeudaPersonal>('/finanzas-personales/deudas', dto);
    return data;
  },

  actualizarDeuda: async (id: number, dto: ActualizarDeudaPersonalDto): Promise<DeudaPersonal> => {
    const { data } = await api.patch<DeudaPersonal>(`/finanzas-personales/deudas/${id}`, dto);
    return data;
  },

  eliminarDeuda: async (id: number): Promise<void> => {
    await api.delete(`/finanzas-personales/deudas/${id}`);
  },

  listarAhorros: async (walletId: number): Promise<AhorroPersonal[]> => {
    const { data } = await api.get<AhorroPersonal[]>('/finanzas-personales/ahorros', { params: { walletId } });
    return data;
  },

  crearAhorro: async (dto: CrearAhorroPersonalDto): Promise<AhorroPersonal> => {
    const { data } = await api.post<AhorroPersonal>('/finanzas-personales/ahorros', dto);
    return data;
  },

  actualizarAhorro: async (id: number, dto: ActualizarAhorroPersonalDto): Promise<AhorroPersonal> => {
    const { data } = await api.patch<AhorroPersonal>(`/finanzas-personales/ahorros/${id}`, dto);
    return data;
  },

  eliminarAhorro: async (id: number): Promise<void> => {
    await api.delete(`/finanzas-personales/ahorros/${id}`);
  },
};
