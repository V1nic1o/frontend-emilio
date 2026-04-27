import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'auth_token';

function esWebConStorage(): boolean {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

export async function getTokenAlmacenado(): Promise<string | null> {
  if (esWebConStorage()) {
    try {
      return localStorage.getItem(CLAVE);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(CLAVE);
  } catch {
    return null;
  }
}

export async function setTokenAlmacenado(token: string): Promise<void> {
  if (esWebConStorage()) {
    try {
      localStorage.setItem(CLAVE, token);
    } catch {
      throw new Error('No se pudo guardar la sesión en este navegador.');
    }
    return;
  }
  await SecureStore.setItemAsync(CLAVE, token);
}

export async function borrarTokenAlmacenado(): Promise<void> {
  if (esWebConStorage()) {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* — */
    }
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE);
}
