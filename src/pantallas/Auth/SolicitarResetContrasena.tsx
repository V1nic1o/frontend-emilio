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
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { mostrarAlerta, alertaUnBoton } from '../../utilidades/alertaPlataforma';
import { authServicio } from '../../servicios/auth.servicio';

type Props = NativeStackScreenProps<AuthStackParamList, 'SolicitarResetContrasena'>;

const SolicitarResetContrasena: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    const e = email.trim().toLowerCase();
    if (!e) {
      mostrarAlerta('Email', 'Ingresá el correo de tu cuenta');
      return;
    }
    setCargando(true);
    try {
      const r = await authServicio.solicitarReset(e);
      alertaUnBoton('Listo', r.mensaje, { onPress: () => navigation.goBack() });
    } catch (err: unknown) {
      mostrarAlerta('Error', err instanceof Error ? err.message : 'Intentá de nuevo');
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.btnVolver} accessibilityLabel="Volver">
              <Ionicons name="arrow-back" size={22} color={COLORES.texto} />
            </TouchableOpacity>
            <Text style={estilos.titulo}>Recuperar contraseña</Text>
            <Text style={estilos.subtitulo}>
              Te enviaremos un correo con un enlace para elegir una contraseña nueva (válido 1 hora).
            </Text>
          </View>

          <View style={estilos.tarjeta}>
            <CampoTexto
              etiqueta="Email de tu cuenta"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icono="mail-outline"
              autoCapitalize="none"
              autoFocus
            />
            <BotonPrimario titulo="Enviar instrucciones" onPress={enviar} cargando={cargando} estilo={{ marginTop: ESPACIADO.sm }} />
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
});

export default SolicitarResetContrasena;
