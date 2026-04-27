import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import Navegacion from './src/navegacion/Navegacion';
import { AuthProvider } from './src/contexto/AuthContext';
import { WalletProvider } from './src/contexto/WalletContext';
import { CarritoCatalogoPedidoProvider } from './src/contexto/CarritoCatalogoContext';

async function verificarActualizacion() {
  try {
    const resultado = await Updates.checkForUpdateAsync();
    if (resultado.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {
    // Sin conexión o en modo desarrollo — se ignora silenciosamente
  }
}

export default function App() {
  useEffect(() => {
    if (!__DEV__) {
      verificarActualizacion();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <WalletProvider>
          <CarritoCatalogoPedidoProvider>
            <Navegacion />
          </CarritoCatalogoPedidoProvider>
        </WalletProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
