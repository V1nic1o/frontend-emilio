import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';
import { authServicio } from '../../servicios/auth.servicio';
import { useWallet } from '../../contexto/WalletContext';

const CambiarContrasena: React.FC = () => {
  const navigation = useNavigation<any>();
  const { walletSeleccionado } = useWallet();
  const esPersonal = walletSeleccionado?.tipo === 'personal';
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);

  const fondo = esPersonal ? PERSONAL.fondo : COLORES.fondo;
  const tarjeta = esPersonal ? PERSONAL.tarjeta : COLORES.tarjeta;
  const borde = esPersonal ? PERSONAL.borde : COLORES.borde;
  const secundario = COLORES.textoSecundario;

  const guardar = async () => {
    if (!actual.trim()) {
      mostrarAlerta('Contraseña actual', 'Ingresá tu contraseña actual');
      return;
    }
    if (!nueva || nueva.length < 8) {
      mostrarAlerta('Nueva contraseña', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (nueva !== confirmar) {
      mostrarAlerta('No coinciden', 'La confirmación no coincide');
      return;
    }
    setCargando(true);
    try {
      const r = await authServicio.cambiarContrasena(actual, nueva);
      mostrarAlerta('Listo', r.mensaje);
      setActual('');
      setNueva('');
      setConfirmar('');
      navigation.goBack();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={[estilos.safe, { backgroundColor: fondo }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[estilos.ayuda, { color: secundario }]}>
            Por seguridad, ingresá tu contraseña actual y elegí una nueva (mínimo 8 caracteres).
          </Text>

          <View style={[estilos.tarjeta, { backgroundColor: tarjeta, borderColor: borde }]}>
            <CampoTexto
              etiqueta="Contraseña actual"
              placeholder="Tu contraseña actual"
              value={actual}
              onChangeText={setActual}
              secureTextEntry
              icono="lock-closed-outline"
            />
            <CampoTexto
              etiqueta="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={nueva}
              onChangeText={setNueva}
              secureTextEntry
              icono="key-outline"
            />
            <CampoTexto
              etiqueta="Confirmar nueva contraseña"
              placeholder="Repetí la nueva contraseña"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry
              icono="lock-closed-outline"
            />
            <BotonPrimario titulo="Actualizar contraseña" onPress={guardar} cargando={cargando} estilo={{ marginTop: ESPACIADO.sm }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: ESPACIADO.md, paddingTop: ESPACIADO.sm },
  ayuda: { fontSize: FUENTE.tamanoPequeno, marginBottom: ESPACIADO.md, lineHeight: 20 },
  tarjeta: {
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    borderWidth: 1,
  },
});

export default CambiarContrasena;
