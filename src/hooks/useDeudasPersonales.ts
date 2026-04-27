import { useState, useCallback } from 'react';
import { DeudaPersonal, CrearDeudaPersonalDto, ActualizarDeudaPersonalDto } from '../tipos';
import { finanzasPersonalesServicio } from '../servicios/finanzasPersonales.servicio';
import { useWallet } from '../contexto/WalletContext';
import { esWalletPersonal } from '../utilidades/wallet';

export const useDeudasPersonales = () => {
  const { walletSeleccionado } = useWallet();
  const [deudas, setDeudas] = useState<DeudaPersonal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado || !esWalletPersonal(walletSeleccionado)) return;
    setCargando(true);
    setError(null);
    try {
      const data = await finanzasPersonalesServicio.listarDeudas(walletSeleccionado.id);
      setDeudas(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar deudas');
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  const crear = useCallback(
    async (dto: Omit<CrearDeudaPersonalDto, 'walletId'>): Promise<DeudaPersonal> => {
      if (!walletSeleccionado) throw new Error('No hay workspace');
      const nuevo = await finanzasPersonalesServicio.crearDeuda({
        ...dto,
        walletId: walletSeleccionado.id,
      });
      setDeudas((prev) => [nuevo, ...prev]);
      return nuevo;
    },
    [walletSeleccionado],
  );

  const actualizar = useCallback(async (id: number, dto: ActualizarDeudaPersonalDto): Promise<void> => {
    const act = await finanzasPersonalesServicio.actualizarDeuda(id, dto);
    setDeudas((prev) => prev.map((d) => (d.id === id ? act : d)));
  }, []);

  const eliminar = useCallback(async (id: number): Promise<void> => {
    await finanzasPersonalesServicio.eliminarDeuda(id);
    setDeudas((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { deudas, cargando, error, cargar, crear, actualizar, eliminar };
};
