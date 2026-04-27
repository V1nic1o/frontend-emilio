import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { DeviceEventEmitter } from 'react-native';
import { isAxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { authServicio, UsuarioAuth } from '../servicios/auth.servicio';
import { EVENTO_SESION_INVALIDA } from '../servicios/api';

interface AuthContextType {
  usuario: UsuarioAuth | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  registrar: (email: string, password: string, nombre: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  login: async () => {},
  registrar: async () => {},
  cerrarSesion: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [cargando, setCargando] = useState(true);

  // Verificar sesión guardada al arrancar la app
  useEffect(() => {
    const verificar = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          const me = await authServicio.me();
          setUsuario(me);
        }
      } catch (e) {
        if (isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
          await SecureStore.deleteItemAsync('auth_token').catch(() => {});
        }
        // Fallo de red u otro: no se borra el token (el usuario puede reintentar)
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    };
    verificar();
  }, []);

  // Token invalidado en otro módulo (p. ej. 401 en axios)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVENTO_SESION_INVALIDA, () => {
      setUsuario(null);
    });
    return () => sub.remove();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, usuario: user } = await authServicio.login(email, password);
    await SecureStore.setItemAsync('auth_token', token);
    setUsuario(user);
  }, []);

  const registrar = useCallback(async (email: string, password: string, nombre: string) => {
    const { token, usuario: user } = await authServicio.registrar(email, password, nombre);
    await SecureStore.setItemAsync('auth_token', token);
    setUsuario(user);
  }, []);

  const cerrarSesion = useCallback(async () => {
    await SecureStore.deleteItemAsync('auth_token').catch(() => {});
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registrar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
