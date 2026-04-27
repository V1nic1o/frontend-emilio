import { useState, useCallback } from 'react';
import { AhorroPersonal, CrearAhorroPersonalDto, ActualizarAhorroPersonalDto } from '../tipos';
import { finanzasPersonalesServicio } from '../servicios/finanzasPersonales.servicio';
import { useWallet } from '../contexto/WalletContext';
import { esWalletPersonal } from '../utilidades/wallet';

export const useAhorrosPersonales = () => {
  const { walletSeleccionado } = useWallet();
  const [ahorros, setAhorros] = useState<AhorroPersonal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado || !esWalletPersonal(walletSeleccionado)) return;
    setCargando(true);
    setError(null);
    try {
      const data = await finanzasPersonalesServicio.listarAhorros(walletSeleccionado.id);
      setAhorros(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar ahorros');
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  const crear = useCallback(
    async (dto: Omit<CrearAhorroPersonalDto, 'walletId'>): Promise<AhorroPersonal> => {
      if (!walletSeleccionado) throw new Error('No hay workspace');
      const nuevo = await finanzasPersonalesServicio.crearAhorro({
        ...dto,
        walletId: walletSeleccionado.id,
      });
      setAhorros((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return nuevo;
    },
    [walletSeleccionado],
  );

  const actualizar = useCallback(async (id: number, dto: ActualizarAhorroPersonalDto): Promise<void> => {
    const act = await finanzasPersonalesServicio.actualizarAhorro(id, dto);
    setAhorros((prev) => prev.map((a) => (a.id === id ? act : a)));
  }, []);

  const eliminar = useCallback(async (id: number): Promise<void> => {
    await finanzasPersonalesServicio.eliminarAhorro(id);
    setAhorros((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { ahorros, cargando, error, cargar, crear, actualizar, eliminar };
};
