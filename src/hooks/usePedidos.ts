import { useState, useCallback, useRef } from 'react';
import {
  Pedido,
  CrearPedidoDto,
  ActualizarPedidoDto,
  CrearPagoDto,
  CrearPagoProveedorDto,
  CrearItemDto,
  ActualizarItemDto,
} from '../tipos';
import { pedidosServicio } from '../servicios/pedidos.servicio';
import { useWallet } from '../contexto/WalletContext';

export const usePedidos = () => {
  const { walletSeleccionado } = useWallet();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colaCargaRef = useRef<Promise<void>>(Promise.resolve());

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    const walletId = walletSeleccionado.id;
    const tarea = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await pedidosServicio.listar(walletId);
        setPedidos(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
      } finally {
        setCargando(false);
      }
    };
    const encadenada = colaCargaRef.current.then(tarea);
    colaCargaRef.current = encadenada.catch(() => {});
    await encadenada;
  }, [walletSeleccionado]);

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
          return { ...prev, pagos: [pago, ...(prev.pagos ?? [])], resumen };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al registrar pago');
      }
    },
    [id]
  );

  const agregarPagoProveedor = useCallback(
    async (dto: CrearPagoProveedorDto): Promise<void> => {
      try {
        const { pago, resumen } = await pedidosServicio.agregarPagoProveedor(id, dto);
        setPedido((prev) => {
          if (!prev) return prev;
          return { ...prev, pagosProveedor: [pago, ...(prev.pagosProveedor ?? [])], resumen };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al registrar pago al proveedor');
      }
    },
    [id]
  );

  const eliminarPago = useCallback(
    async (pagoId: number): Promise<void> => {
      try {
        const { resumen } = await pedidosServicio.eliminarPago(id, pagoId);
        setPedido((prev) => {
          if (!prev) return prev;
          return { ...prev, pagos: (prev.pagos ?? []).filter((p) => p.id !== pagoId), resumen };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al eliminar pago');
      }
    },
    [id]
  );

  const eliminarPagoProveedor = useCallback(
    async (pagoId: number): Promise<void> => {
      try {
        const { resumen } = await pedidosServicio.eliminarPagoProveedor(id, pagoId);
        setPedido((prev) => {
          if (!prev) return prev;
          return { ...prev, pagosProveedor: (prev.pagosProveedor ?? []).filter((p) => p.id !== pagoId), resumen };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al eliminar pago al proveedor');
      }
    },
    [id]
  );

  const agregarItem = useCallback(
    async (dto: CrearItemDto): Promise<void> => {
      try {
        const { item, resumen } = await pedidosServicio.agregarItem(id, dto);
        setPedido((prev) => {
          if (!prev) return prev;
          return { ...prev, items: [...(prev.items ?? []), item], resumen };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al agregar ítem');
      }
    },
    [id]
  );

  const actualizarItem = useCallback(
    async (itemId: number, dto: ActualizarItemDto): Promise<void> => {
      try {
        const { item, resumen } = await pedidosServicio.actualizarItem(id, itemId, dto);
        setPedido((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: (prev.items ?? []).map((i) => (i.id === itemId ? item : i)),
            resumen,
          };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al actualizar ítem');
      }
    },
    [id]
  );

  const eliminarItem = useCallback(
    async (itemId: number): Promise<void> => {
      try {
        const { resumen } = await pedidosServicio.eliminarItem(id, itemId);
        setPedido((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: (prev.items ?? []).filter((i) => i.id !== itemId),
            resumen,
          };
        });
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al eliminar ítem');
      }
    },
    [id]
  );

  const actualizarPedido = useCallback(
    async (dto: ActualizarPedidoDto): Promise<void> => {
      try {
        const actualizado = await pedidosServicio.actualizar(id, dto);
        setPedido(actualizado);
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : 'Error al actualizar el pedido');
      }
    },
    [id],
  );

  return {
    pedido,
    cargando,
    error,
    cargar,
    agregarPago,
    agregarPagoProveedor,
    eliminarPago,
    eliminarPagoProveedor,
    agregarItem,
    actualizarItem,
    eliminarItem,
    actualizarPedido,
  };
};
