import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Producto, TipoItem } from '../tipos';
import { useWallet } from './WalletContext';

export type LineaCarritoCatalogo = {
  productoId: number;
  tipo: TipoItem;
  nombre: string;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
};

type CarritoCatalogoContextValue = {
  lineas: LineaCarritoCatalogo[];
  /** Suma de cantidades en el carrito (unidades). */
  unidadesEnCarrito: number;
  agregarProducto: (p: Producto, cantidad?: number) => void;
  agregarSeleccion: (productos: Producto[]) => void;
  /** Suma `delta` a la cantidad de la línea con ese productoId; si queda ≤ 0, se quita la línea. */
  ajustarCantidadPorProductoId: (productoId: number, delta: number) => void;
  /** Fija la cantidad (útil para escribir números grandes). ≤ 0 elimina la línea. */
  setCantidadAbsolutaPorProductoId: (productoId: number, cantidad: number) => void;
  limpiarCarrito: () => void;
  /** Debe llamarse justo antes de navegar a CrearPedido para aplicar el carrito en el formulario. */
  marcarTransferenciaAlPedido: () => void;
  /**
   * Si había transferencia pendiente, devuelve copia de las líneas y vacía el carrito.
   * Si no, devuelve [] y no modifica el estado.
   */
  consumirLineasSiTransferenciaPendiente: () => LineaCarritoCatalogo[];
};

const CarritoCatalogoContext = createContext<CarritoCatalogoContextValue | null>(null);

export function CarritoCatalogoPedidoProvider({ children }: { children: React.ReactNode }) {
  const { walletSeleccionado } = useWallet();
  const [lineas, setLineas] = useState<LineaCarritoCatalogo[]>([]);
  const lineasRef = useRef<LineaCarritoCatalogo[]>([]);
  const transferenciaPendienteRef = useRef(false);

  useEffect(() => {
    lineasRef.current = lineas;
  }, [lineas]);

  useEffect(() => {
    setLineas([]);
    lineasRef.current = [];
    transferenciaPendienteRef.current = false;
  }, [walletSeleccionado?.id]);

  const agregarProducto = useCallback((p: Producto, cantidad = 1) => {
    const c = Math.max(1, cantidad);
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.productoId === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], cantidad: next[i].cantidad + c };
        return next;
      }
      return [
        ...prev,
        {
          productoId: p.id,
          tipo: p.tipo,
          nombre: p.nombre,
          cantidad: c,
          precioCompra: p.precioProveedor,
          precioVenta: p.precioEmpresa,
        },
      ];
    });
  }, []);

  const agregarSeleccion = useCallback(
    (productos: Producto[]) => {
      productos.forEach((p) => agregarProducto(p, 1));
    },
    [agregarProducto],
  );

  const ajustarCantidadPorProductoId = useCallback((productoId: number, delta: number) => {
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.productoId === productoId);
      if (i < 0) return prev;
      const nueva = prev[i].cantidad + delta;
      if (nueva <= 0) {
        return prev.filter((_, idx) => idx !== i);
      }
      const next = [...prev];
      next[i] = { ...next[i], cantidad: nueva };
      return next;
    });
  }, []);

  const MAX_CANTIDAD_CARRITO = 9_999_999;

  const setCantidadAbsolutaPorProductoId = useCallback((productoId: number, cantidad: number) => {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setLineas((prev) => prev.filter((l) => l.productoId !== productoId));
      return;
    }
    const c = Math.min(cantidad, MAX_CANTIDAD_CARRITO);
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.productoId === productoId);
      if (i < 0) return prev;
      const next = [...prev];
      next[i] = { ...next[i], cantidad: c };
      return next;
    });
  }, []);

  const limpiarCarrito = useCallback(() => {
    setLineas([]);
    lineasRef.current = [];
    transferenciaPendienteRef.current = false;
  }, []);

  const marcarTransferenciaAlPedido = useCallback(() => {
    transferenciaPendienteRef.current = true;
  }, []);

  const consumirLineasSiTransferenciaPendiente = useCallback(() => {
    if (!transferenciaPendienteRef.current) return [];
    transferenciaPendienteRef.current = false;
    const out = lineasRef.current.map((l) => ({ ...l }));
    setLineas([]);
    lineasRef.current = [];
    return out;
  }, []);

  const unidadesEnCarrito = useMemo(
    () => lineas.reduce((acc, l) => acc + l.cantidad, 0),
    [lineas],
  );

  const value = useMemo(
    () => ({
      lineas,
      unidadesEnCarrito,
      agregarProducto,
      agregarSeleccion,
      ajustarCantidadPorProductoId,
      setCantidadAbsolutaPorProductoId,
      limpiarCarrito,
      marcarTransferenciaAlPedido,
      consumirLineasSiTransferenciaPendiente,
    }),
    [
      lineas,
      unidadesEnCarrito,
      agregarProducto,
      agregarSeleccion,
      ajustarCantidadPorProductoId,
      setCantidadAbsolutaPorProductoId,
      limpiarCarrito,
      marcarTransferenciaAlPedido,
      consumirLineasSiTransferenciaPendiente,
    ],
  );

  return (
    <CarritoCatalogoContext.Provider value={value}>{children}</CarritoCatalogoContext.Provider>
  );
}

export function useCarritoCatalogoPedido(): CarritoCatalogoContextValue {
  const ctx = useContext(CarritoCatalogoContext);
  if (!ctx) {
    throw new Error('useCarritoCatalogoPedido debe usarse dentro de CarritoCatalogoPedidoProvider');
  }
  return ctx;
}
