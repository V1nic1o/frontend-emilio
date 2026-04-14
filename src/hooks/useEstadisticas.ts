import { useState, useCallback } from 'react';
import { estadisticasServicio } from '../servicios/estadisticas.servicio';
import { Estadisticas } from '../tipos';

export function useEstadisticas() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await estadisticasServicio.obtenerResumen();
      setEstadisticas(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas');
    } finally {
      setCargando(false);
    }
  }, []);

  return { estadisticas, cargando, error, cargar };
}
