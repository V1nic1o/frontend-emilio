import axios, { isAxiosError } from 'axios';
import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Mismo evento en AuthContext: sesión inválida en la API (401). */
export const EVENTO_SESION_INVALIDA = 'auth:sesionInvalida';

/**
 * Backend en producción (Cloud Run). Sin EXPO_PUBLIC_API_URL, el cliente siempre apunta acá
 * (incluido Expo en modo desarrollo en un iPhone: evita timeout al intentar 192.168.x.x:3000).
 * Para probar con backend local: EXPO_PUBLIC_API_URL=http://IP:3000/api en .env
 */
const URL_PRODUCCION = 'https://pedidos-backend-4jbtgazerq-uc.a.run.app/api';

const urlDesdeEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

const BASE_URL = urlDesdeEnv && urlDesdeEnv.length > 0 ? urlDesdeEnv : URL_PRODUCCION;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // SecureStore puede fallar en web/emulador sin soporte
  }
  return config;
});

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const ruta = error.config?.url ?? '';
      const esAuthPublico =
        ruta.includes('auth/login') || ruta.includes('auth/registrar');
      if (!esAuthPublico) {
        try {
          await SecureStore.deleteItemAsync('auth_token');
        } catch {
          // —
        }
        DeviceEventEmitter.emit(EVENTO_SESION_INVALIDA);
      }
    }

    const datos = isAxiosError(error) ? error.response?.data : undefined;
    let mensaje = 'Error de conexión. Verifica que el servidor esté activo.';
    if (datos && typeof datos === 'object' && 'message' in datos) {
      const m = (datos as { message: unknown }).message;
      mensaje = Array.isArray(m) ? String(m[0]) : String(m);
    } else if (error instanceof Error) {
      mensaje = error.message;
    }
    return Promise.reject(new Error(mensaje));
  }
);

export default api;
