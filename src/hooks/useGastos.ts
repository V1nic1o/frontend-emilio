import { useState, useCallback } from 'react';
import { Gasto, CrearGastoDto } from '../tipos';
import { gastosServicio } from '../servicios/gastos.servicio';

export const useGastos = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await gastosServicio.listar();
      setGastos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar gastos');
    } finally {
      setCargando(false);
    }
  }, []);

  const crear = useCallback(async (dto: CrearGastoDto): Promise<Gasto> => {
    try {
      const nuevo = await gastosServicio.crear(dto);
      setGastos((prev) => [nuevo, ...prev]);
      return nuevo;
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al crear gasto');
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

  return { gastos, cargando, error, cargar, crear, eliminar };
};
