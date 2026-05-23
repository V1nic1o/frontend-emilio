import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Wallet } from '../tipos';
import { walletsServicio } from '../servicios/wallets.servicio';
import { useAuth } from './AuthContext';

interface WalletContextType {
  wallets: Wallet[];
  walletSeleccionado: Wallet | null;
  cargando: boolean;
  seleccionar: (wallet: Wallet) => void;
  limpiar: () => void;
  /** Vuelve a la pantalla de elección de workspace sin borrar la lista ni cerrar sesión. */
  volverAElegirWorkspace: () => void;
  recargarWallets: () => Promise<void>;
  /** Suma 1 para que Inicio/estadísticas vuelvan a cargar (p. ej. tras crear o borrar una asesoría). */
  solicitarRefrescoFinanzas: () => void;
  finanzasEpoch: number;
}

const WalletContext = createContext<WalletContextType>({
  wallets: [],
  walletSeleccionado: null,
  cargando: true,
  seleccionar: () => {},
  limpiar: () => {},
  volverAElegirWorkspace: () => {},
  recargarWallets: async () => {},
  solicitarRefrescoFinanzas: () => {},
  finanzasEpoch: 0,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletSeleccionado, setWalletSeleccionado] = useState<Wallet | null>(null);
  const [cargando, setCargando] = useState(true);
  const [finanzasEpoch, setFinanzasEpoch] = useState(0);

  const solicitarRefrescoFinanzas = useCallback(() => {
    setFinanzasEpoch((n) => n + 1);
  }, []);

  // Recarga la lista desde la API (p. ej. al volver a «Mis Workspaces» o tras crear/eliminar).
  const recargarWallets = useCallback(async () => {
    try {
      const data = await walletsServicio.listar();
      setWallets(data);
    } catch {
      // sin conexión
    }
  }, []);

  // Cargar al iniciar o cambiar de sesión; sin usuario no hay listado.
  useEffect(() => {
    if (!usuario) {
      setWallets([]);
      setWalletSeleccionado(null);
      setFinanzasEpoch(0);
      setCargando(false);
      return;
    }

    let cancel = false;
    (async () => {
      setCargando(true);
      try {
        const data = await walletsServicio.listar();
        if (cancel) return;
        setWallets(data);
      } catch {
        if (!cancel) {
          setWallets([]);
        }
      } finally {
        if (!cancel) {
          setCargando(false);
        }
      }
    })();

    return () => {
      cancel = true;
    };
  }, [usuario?.id]);

  const seleccionar = useCallback((wallet: Wallet) => {
    setWalletSeleccionado(wallet);
    setFinanzasEpoch((n) => n + 1);
  }, []);

  const volverAElegirWorkspace = useCallback(() => {
    setWalletSeleccionado(null);
    setFinanzasEpoch((n) => n + 1);
  }, []);

  const limpiar = useCallback(() => {
    setWalletSeleccionado(null);
    setWallets([]);
    setFinanzasEpoch(0);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallets,
        walletSeleccionado,
        cargando,
        seleccionar,
        limpiar,
        volverAElegirWorkspace,
        recargarWallets,
        solicitarRefrescoFinanzas,
        finanzasEpoch,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
