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

type Props = NativeStackScreenProps<AuthStackParamList, 'Registro'>;

const Registro: React.FC<Props> = ({ navigation }) => {
  const { registrar } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleRegistrar = async () => {
    if (!nombre.trim() || !email.trim() || !password || !confirmar) {
      mostrarAlerta('Campos requeridos', 'Completá todos los campos');
      return;
    }
    if (password !== confirmar) {
      mostrarAlerta('Contraseñas distintas', 'Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      mostrarAlerta('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCargando(true);
    try {
      await registrar(email.trim().toLowerCase(), password, nombre.trim());
    } catch (e: unknown) {
      mostrarAlerta('Error al registrarse', e instanceof Error ? e.message : 'Intentá nuevamente');
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

          <View style={estilos.encabezado}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.btnVolver}>
              <Ionicons name="arrow-back" size={22} color={COLORES.texto} />
            </TouchableOpacity>
            <View style={estilos.logoIcono}>
              <Ionicons name="person-add" size={32} color={COLORES.blanco} />
            </View>
            <Text style={estilos.titulo}>Crear cuenta</Text>
            <Text style={estilos.subtitulo}>Registrate para empezar a gestionar tus pedidos</Text>
          </View>

          <View style={estilos.tarjeta}>
            <CampoTexto
              etiqueta="Tu nombre"
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChangeText={setNombre}
              icono="person-outline"
              autoFocus
            />
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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icono="lock-closed-outline"
            />
            <CampoTexto
              etiqueta="Confirmar contraseña"
              placeholder="Repetí tu contraseña"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry
              icono="lock-closed-outline"
            />

            <BotonPrimario
              titulo="Crear cuenta"
              onPress={handleRegistrar}
              cargando={cargando}
              estilo={{ marginTop: ESPACIADO.sm }}
            />
          </View>

          <View style={estilos.pie}>
            <Text style={estilos.pieTexto}>¿Ya tenés cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
              <Text style={estilos.pieEnlace}> Iniciá sesión</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { flexGrow: 1, padding: ESPACIADO.lg, paddingTop: ESPACIADO.sm },
  encabezado: { alignItems: 'center', marginBottom: ESPACIADO.xl },
  btnVolver: { alignSelf: 'flex-start', padding: 4, marginBottom: ESPACIADO.md },
  logoIcono: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: COLORES.primario,
    alignItems: 'center', justifyContent: 'center', marginBottom: ESPACIADO.md,
  },
  titulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 4 },
  subtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
  tarjeta: {
    backgroundColor: COLORES.tarjeta, borderRadius: RADIO.xl,
    padding: ESPACIADO.lg, borderWidth: 1, borderColor: COLORES.borde,
  },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: ESPACIADO.xl },
  pieTexto: { color: COLORES.textoSecundario, fontSize: FUENTE.tamanoPequeno },
  pieEnlace: { color: COLORES.primario, fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold },
});

export default Registro;
