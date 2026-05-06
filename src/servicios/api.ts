import axios, { AxiosError, isAxiosError } from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { borrarTokenAlmacenado, getTokenAlmacenado } from '../utilidades/almacenamientoToken';

/** Mismo evento en AuthContext: sesión inválida en la API (401). */
export const EVENTO_SESION_INVALIDA = 'auth:sesionInvalida';

/**
 * Mismo criterio que el interceptor de respuesta, para `catch` locales si hace falta.
 */
export function mensajeUsuarioDesdeErrorApi(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (isAxiosError(error)) return mensajeDesdeErrorAxios(error);
  return 'Ocurrió un error inesperado.';
}

function extraerMensajeCuerpo(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const msg = (data as { message?: unknown }).message;
  if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
  if (typeof msg === 'string' && msg.trim()) return msg;
  return null;
}

function mensajeDesdeErrorAxios(error: AxiosError): string {
  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 403) return 'No tenés permiso para esta acción.';
  if (status === 404) {
    const m = extraerMensajeCuerpo(data);
    return m || 'El recurso no existe o ya no está disponible.';
  }
  if (status === 408 || status === 504) return 'El servidor tardó demasiado en responder. Intentá de nuevo.';
  if (status != null && status >= 500) {
    const m = extraerMensajeCuerpo(data);
    if (m) return m;
    return 'El servidor tuvo un problema. Intentá en unos minutos.';
  }

  const delCuerpo = extraerMensajeCuerpo(data);
  if (delCuerpo) return delCuerpo;
  if (status === 400) return 'Los datos enviados no son válidos. Revisá los campos.';

  if (error.code === 'ECONNABORTED') return 'Tiempo de espera agotado. Revisá tu conexión e intentá de nuevo.';
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return 'Sin conexión a internet o el servidor no responde.';
  }
  return 'Error de conexión. Verificá tu red o que el servidor esté disponible.';
}

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
  const token = await getTokenAlmacenado();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      return Promise.reject(error instanceof Error ? error : new Error('Error desconocido'));
    }

    const ruta = error.config?.url ?? '';
    const esAuthPublico =
      ruta.includes('auth/login') ||
      ruta.includes('auth/registrar') ||
      ruta.includes('auth/solicitar-reset') ||
      ruta.includes('auth/restablecer-contrasena');
    const status = error.response?.status;

    if (status === 401 && !esAuthPublico) {
      try {
        await borrarTokenAlmacenado();
      } catch {
        // —
      }
      DeviceEventEmitter.emit(EVENTO_SESION_INVALIDA);
      return Promise.reject(new Error('Sesión expirada o inválida. Iniciá sesión de nuevo.'));
    }

    if (error.response) {
      return Promise.reject(new Error(mensajeDesdeErrorAxios(error)));
    }

    return Promise.reject(new Error(mensajeDesdeErrorAxios(error)));
  },
);

export default api;
