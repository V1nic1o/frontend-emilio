import api from './api';
import { Wallet, CrearWalletDto, ActualizarWalletDto } from '../tipos';

export const walletsServicio = {
  listar: async (): Promise<Wallet[]> => {
    const { data } = await api.get<Wallet[]>('/wallets');
    return data;
  },

  crear: async (dto: CrearWalletDto): Promise<Wallet> => {
    const { data } = await api.post<Wallet>('/wallets', dto);
    return data;
  },

  actualizar: async (id: number, dto: ActualizarWalletDto): Promise<Wallet> => {
    const { data } = await api.patch<Wallet>(`/wallets/${id}`, dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/wallets/${id}`);
  },
};
