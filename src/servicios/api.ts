import axios from 'axios';
import { Platform } from 'react-native';

// ----------------------------------------------------------------
// PRODUCCIÓN: después de correr deploy.sh, pegá la URL de Cloud Run
// Ejemplo: const CLOUD_RUN_URL = 'https://pedidos-backend-xxxx-uc.a.run.app/api';
// ----------------------------------------------------------------
const CLOUD_RUN_URL: string | null = 'https://pedidos-backend-4jbtgazerq-uc.a.run.app/api';

// IP de tu Mac en la red local para desarrollo
// Si cambia de red, actualizá con: ipconfig getifaddr en0
const IP_LOCAL = '192.168.1.14';

const BASE_URL = CLOUD_RUN_URL ?? Platform.select({
  android: `http://10.0.2.2:3000/api`,       // Emulador Android
  ios: `http://${IP_LOCAL}:3000/api`,         // Simulador iOS o celular físico
  default: `http://${IP_LOCAL}:3000/api`,
});

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const datos = error.response?.data;
    let mensaje = 'Error de conexión. Verifica que el servidor esté activo.';

    if (datos?.message) {
      mensaje = Array.isArray(datos.message) ? datos.message[0] : datos.message;
    } else if (error.message) {
      mensaje = error.message;
    }

    return Promise.reject(new Error(mensaje));
  }
);

export default api;
