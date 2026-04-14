import { useState, useCallback } from 'react';
import { Pedido, CrearPedidoDto, CrearPagoDto } from '../tipos';
import { pedidosServicio } from '../servicios/pedidos.servicio';

export const usePedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await pedidosServicio.listar();
      setPedidos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
    } finally {
      setCargando(false);
    }
  }, []);

  const crear = useCallback(async (dto: CrearPedidoDto): Promise<Pedido> => {
    try {
      const nuevo = await pedidosServicio.crear(dto);
      setPedidos((prev) => [nuevo, ...prev]);
      return nuevo;
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al crear pedido');
    }
  }, []);

  const eliminar = useCallback(async (id: number): Promise<void> => {
    try {
      await pedidosServicio.eliminar(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      throw new Error(e instanceof Error ? e.message : 'Error al eliminar pedido');
    }
  }, []);

  return { pedidos, cargando, error, cargar, crear, eliminar };
};

export const usePedidoDetalle = (id: number) => {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await pedidosServicio.obtenerPorId(id);
      setPedido(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar pedido');
    } finally {
      setCargando(false);
    }
  }, [id]);

  const agregarPago = useCallback(
    async (dto: CrearPagoDto): Promise<void> => {
      try {
        const { pago, resumen } = await pedidosServicio.agregarPago(id, dto);
        setPedido((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pagos: [pago, ...(prev.pagos ?? [])],
            resumen,
          };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al registrar pago');
      }
    },
    [id]
  );

  return { pedido, cargando, error, cargar, agregarPago };
};
