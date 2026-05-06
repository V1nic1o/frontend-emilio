import React, { useEffect, useState } from 'react';
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
import * as Linking from 'expo-linking';
import { AuthStackParamList } from '../../navegacion/tipos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';
import { authServicio } from '../../servicios/auth.servicio';

type Props = NativeStackScreenProps<AuthStackParamList, 'RestablecerContrasena'>;

function extraerTokenDesdeUrl(url: string | null): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  const idx = lower.indexOf('restablecer-contrasena/');
  if (idx === -1) return null;
  const rest = url.slice(idx + 'restablecer-contrasena/'.length);
  const token = rest.split(/[?#]/)[0]?.replace(/\/$/, '') ?? '';
  return /^[a-f0-9]{64}$/i.test(token) ? token : null;
}

const RestablecerContrasena: React.FC<Props> = ({ navigation, route }) => {
  const [token, setToken] = useState(route.params?.token?.trim() ?? '');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (token) return;
    void Linking.getInitialURL().then((u) => {
      const t = extraerTokenDesdeUrl(u);
      if (t) setToken(t);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const t = extraerTokenDesdeUrl(url);
      if (t) setToken(t);
    });
    return () => sub.remove();
  }, [token]);

  useEffect(() => {
    if (token || Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    const t = extraerTokenDesdeUrl(window.location.href);
    if (t) setToken(t);
  }, [token]);

  const guardar = async () => {
    if (!/^[a-f0-9]{64}$/i.test(token.trim())) {
      mostrarAlerta('Enlace inválido', 'Abrí el enlace completo que recibiste por email.');
      return;
    }
    if (!nueva || nueva.length < 8) {
      mostrarAlerta('Contraseña', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (nueva !== confirmar) {
      mostrarAlerta('No coinciden', 'Repetí la misma contraseña en ambos campos');
      return;
    }
    setCargando(true);
    try {
      const r = await authServicio.restablecerContrasena(token.trim().toLowerCase(), nueva);
      mostrarAlerta('Listo', r.mensaje);
      navigation.replace('Login');
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setCargando(false);
    }
  };

  const tokenInvalido = token.length > 0 && !/^[a-f0-9]{64}$/i.test(token);

  return (
    <SafeAreaView style={estilos.contenedor}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.encabezado}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={estilos.btnVolver} accessibilityLabel="Volver al inicio de sesión">
              <Ionicons name="arrow-back" size={22} color={COLORES.texto} />
            </TouchableOpacity>
            <Text style={estilos.titulo}>Nueva contraseña</Text>
            <Text style={estilos.subtitulo}>Elegí una contraseña segura para tu cuenta.</Text>
          </View>

          <View style={estilos.tarjeta}>
            {!token || tokenInvalido ? (
              <Text style={estilos.aviso}>
                {tokenInvalido
                  ? 'El enlace parece incompleto. Volvé a abrir el correo y tocá el enlace otra vez.'
                  : 'Esperando enlace… Si abriste esta pantalla desde el email, esperá un momento.'}
              </Text>
            ) : null}

            <CampoTexto
              etiqueta="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={nueva}
              onChangeText={setNueva}
              secureTextEntry
              icono="lock-closed-outline"
            />
            <CampoTexto
              etiqueta="Confirmar contraseña"
              placeholder="Repetí la contraseña"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry
              icono="lock-closed-outline"
            />
            <BotonPrimario titulo="Guardar y entrar" onPress={guardar} cargando={cargando} estilo={{ marginTop: ESPACIADO.sm }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { flexGrow: 1, padding: ESPACIADO.lg, justifyContent: 'center' },
  encabezado: { marginBottom: ESPACIADO.lg },
  btnVolver: { alignSelf: 'flex-start', marginBottom: ESPACIADO.md, padding: 4 },
  titulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: ESPACIADO.sm },
  subtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, lineHeight: 20 },
  tarjeta: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  aviso: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginBottom: ESPACIADO.md, lineHeight: 18 },
});

export default RestablecerContrasena;
