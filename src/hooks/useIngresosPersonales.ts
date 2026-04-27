import { useState, useCallback } from 'react';
import { IngresoPersonal, CrearIngresoPersonalDto, ActualizarIngresoPersonalDto } from '../tipos';
import { finanzasPersonalesServicio } from '../servicios/finanzasPersonales.servicio';
import { useWallet } from '../contexto/WalletContext';
import { esWalletPersonal } from '../utilidades/wallet';

export const useIngresosPersonales = () => {
  const { walletSeleccionado } = useWallet();
  const [items, setItems] = useState<IngresoPersonal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado || !esWalletPersonal(walletSeleccionado)) return;
    setCargando(true);
    setError(null);
    try {
      const data = await finanzasPersonalesServicio.listarIngresos(walletSeleccionado.id);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar ingresos');
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  const crear = useCallback(
    async (dto: Omit<CrearIngresoPersonalDto, 'walletId'>): Promise<IngresoPersonal> => {
      if (!walletSeleccionado) throw new Error('No hay workspace');
      const nuevo = await finanzasPersonalesServicio.crearIngreso({
        ...dto,
        walletId: walletSeleccionado.id,
      });
      setItems((prev) => [nuevo, ...prev]);
      return nuevo;
    },
    [walletSeleccionado],
  );

  const actualizar = useCallback(async (id: number, dto: ActualizarIngresoPersonalDto): Promise<IngresoPersonal> => {
    const act = await finanzasPersonalesServicio.actualizarIngreso(id, dto);
    setItems((prev) => prev.map((x) => (x.id === id ? act : x)));
    return act;
  }, []);

  const eliminar = useCallback(async (id: number): Promise<void> => {
    await finanzasPersonalesServicio.eliminarIngreso(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { ingresos: items, cargando, error, cargar, crear, actualizar, eliminar };
};
