import { useState, useCallback } from 'react';
import { estadisticasServicio } from '../servicios/estadisticas.servicio';
import { Estadisticas } from '../tipos';
import { useWallet } from '../contexto/WalletContext';

export function useEstadisticas() {
  const { walletSeleccionado } = useWallet();
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    setCargando(true);
    setError(null);
    try {
      const data = await estadisticasServicio.obtenerResumen(walletSeleccionado.id);
      setEstadisticas(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas');
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  return { estadisticas, cargando, error, cargar };
}
