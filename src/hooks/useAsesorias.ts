import { useState, useCallback } from 'react';
import { useWallet } from '../contexto/WalletContext';
import { asesoriasServicio } from '../servicios/asesorias.servicio';
import { AsesoriaPendienteResumen, AsesoriaPorPersonaRespuesta } from '../tipos';

export function useAsesoriaPersona(personaId: number) {
  const { walletSeleccionado } = useWallet();
  const [data, setData] = useState<AsesoriaPorPersonaRespuesta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    setCargando(true);
    setError(null);
    try {
      try {
        await asesoriasServicio.sincronizar(walletSeleccionado.id);
      } catch {
        // Sin red u offline: igual mostramos datos ya guardados
      }
      const r = await asesoriasServicio.obtenerPorPersona(personaId, walletSeleccionado.id);
      setData(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar la asesoría mensual');
      setData(null);
    } finally {
      setCargando(false);
    }
  }, [personaId, walletSeleccionado]);

  return { data, cargar, cargando, error };
}

export function useAsesoriasPendientes() {
  const { walletSeleccionado } = useWallet();
  const [pendientes, setPendientes] = useState<AsesoriaPendienteResumen[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    setCargando(true);
    try {
      const list = await asesoriasServicio.listarPendientes(walletSeleccionado.id);
      setPendientes(list);
    } catch {
      setPendientes([]);
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  return { pendientes, cargar, cargando };
}
