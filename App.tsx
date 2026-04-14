import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navegacion from './src/navegacion/Navegacion';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Navegacion />
    </SafeAreaProvider>
  );
}
