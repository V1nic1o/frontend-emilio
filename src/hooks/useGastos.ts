import { useState, useCallback } from 'react';
import { Gasto, CrearGastoDto, ActualizarGastoDto } from '../tipos';
import { gastosServicio } from '../servicios/gastos.servicio';
import { useWallet } from '../contexto/WalletContext';

export const useGastos = () => {
  const { walletSeleccionado } = useWallet();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    setCargando(true);
    setError(null);
    try {
      const data = await gastosServicio.listar(walletSeleccionado.id);
      setGastos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar gastos');
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  const crear = useCallback(async (dto: Omit<CrearGastoDto, 'walletId'>): Promise<Gasto> => {
    if (!walletSeleccionado) throw new Error('No hay wallet seleccionado');
    try {
      const nuevo = await gastosServicio.crear({ ...dto, walletId: walletSeleccionado.id });
      setGastos((prev) => [nuevo, ...prev]);
      return nuevo;
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al crear gasto');
    }
  }, [walletSeleccionado]);

  const actualizar = useCallback(async (id: number, dto: ActualizarGastoDto): Promise<Gasto> => {
    try {
      const act = await gastosServicio.actualizar(id, dto);
      setGastos((prev) => prev.map((g) => (g.id === id ? act : g)));
      return act;
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al actualizar gasto');
    }
  }, []);

  const eliminar = useCallback(async (id: number): Promise<void> => {
    try {
      await gastosServicio.eliminar(id);
      setGastos((prev) => prev.filter((g) => g.id !== id));
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al eliminar gasto');
    }
  }, []);

  return { gastos, cargando, error, cargar, crear, actualizar, eliminar };
};
