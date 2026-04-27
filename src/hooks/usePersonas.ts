import { useState, useCallback, useRef } from 'react';
import { Persona, CrearPersonaDto } from '../tipos';
import { personasServicio, ActualizarPersonaDto } from '../servicios/personas.servicio';
import { useWallet } from '../contexto/WalletContext';

export const usePersonas = () => {
  const { walletSeleccionado } = useWallet();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Evita carreras: varias cargas en paralelo dejaban `error` de un intento viejo con lista vacía. */
  const colaCargaRef = useRef<Promise<void>>(Promise.resolve());

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    const walletId = walletSeleccionado.id;
    const tarea = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await personasServicio.listar(walletId);
        setPersonas(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar personas');
      } finally {
        setCargando(false);
      }
    };
    const encadenada = colaCargaRef.current.then(tarea);
    colaCargaRef.current = encadenada.catch(() => {});
    await encadenada;
  }, [walletSeleccionado]);

  const crear = useCallback(async (dto: Omit<CrearPersonaDto, 'walletId'>): Promise<Persona | null> => {
    if (!walletSeleccionado) throw new Error('No hay wallet seleccionado');
    try {
      const nueva = await personasServicio.crear({ ...dto, walletId: walletSeleccionado.id });
      setPersonas((prev) => [nueva, ...prev]);
      return nueva;
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al crear persona');
    }
  }, [walletSeleccionado]);

  const actualizar = useCallback(async (id: number, dto: ActualizarPersonaDto): Promise<void> => {
    try {
      const actualizada = await personasServicio.actualizar(id, dto);
      setPersonas((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al actualizar persona');
    }
  }, []);

  const eliminar = useCallback(async (id: number): Promise<void> => {
    try {
      await personasServicio.eliminar(id);
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al eliminar persona');
    }
  }, []);

  return { personas, cargando, error, cargar, crear, actualizar, eliminar };
};

export const usePersonaDetalle = (id: number) => {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await personasServicio.obtenerPorId(id);
      setPersona(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar persona');
    } finally {
      setCargando(false);
    }
  }, [id]);

  return { persona, cargando, error, cargar };
};
