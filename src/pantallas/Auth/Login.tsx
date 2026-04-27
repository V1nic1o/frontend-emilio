import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navegacion/tipos';
import { useAuth } from '../../contexto/AuthContext';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const Login: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      mostrarAlerta('Campos requeridos', 'Ingresá tu email y contraseña');
      return;
    }
    setCargando(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: unknown) {
      mostrarAlerta('Error al iniciar sesión', e instanceof Error ? e.message : 'Intentá nuevamente');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <View style={estilos.logoBox}>
            <View style={estilos.logoIcono}>
              <Ionicons name="cube" size={36} color={COLORES.blanco} />
            </View>
            <Text style={estilos.logoTitulo}>Gestión de pedidos</Text>
            <Text style={estilos.logoSubtitulo}>Iniciá sesión en tu cuenta</Text>
          </View>

          <View style={estilos.tarjeta}>
            <CampoTexto
              etiqueta="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icono="mail-outline"
              autoCapitalize="none"
            />

            <CampoTexto
              etiqueta="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icono="lock-closed-outline"
            />

            <BotonPrimario
              titulo="Iniciar sesión"
              onPress={handleLogin}
              cargando={cargando}
              estilo={{ marginTop: ESPACIADO.sm }}
            />
          </View>

          <View style={estilos.pie}>
            <Text style={estilos.pieTexto}>¿No tenés cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Registro')} activeOpacity={0.8}>
              <Text style={estilos.pieEnlace}> Registrate</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { flexGrow: 1, padding: ESPACIADO.lg, justifyContent: 'center' },
  logoBox: { alignItems: 'center', marginBottom: ESPACIADO.xl },
  logoIcono: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: COLORES.primario,
    alignItems: 'center', justifyContent: 'center', marginBottom: ESPACIADO.md,
    shadowColor: COLORES.primario, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  logoTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 4 },
  logoSubtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },
  tarjeta: {
    backgroundColor: COLORES.tarjeta, borderRadius: RADIO.xl,
    padding: ESPACIADO.lg, borderWidth: 1, borderColor: COLORES.borde,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: ESPACIADO.xl },
  pieTexto: { color: COLORES.textoSecundario, fontSize: FUENTE.tamanoPequeno },
  pieEnlace: { color: COLORES.primario, fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold },
});

export default Login;
