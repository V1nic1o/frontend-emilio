import { useState, useCallback } from 'react';
import { Persona, CrearPersonaDto } from '../tipos';
import { personasServicio } from '../servicios/personas.servicio';

export const usePersonas = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await personasServicio.listar();
      setPersonas(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar personas');
    } finally {
      setCargando(false);
    }
  }, []);

  const crear = useCallback(async (dto: CrearPersonaDto): Promise<Persona | null> => {
    try {
      const nueva = await personasServicio.crear(dto);
      setPersonas((prev) => [nueva, ...prev]);
      return nueva;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear persona';
      throw new Error(msg);
    }
  }, []);

  return { personas, cargando, error, cargar, crear };
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
