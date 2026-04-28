import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DeudasPersonalStackParamList } from '../../../navegacion/tipos';
import { useDeudasPersonales } from '../../../hooks/useDeudasPersonales';
import CampoTexto from '../../../componentes/CampoTexto';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { PERSONAL } from '../../../estilos/personalTema';
import { estilosComunes, ESPACIADO, SCROLL_FORM_PADDING_BOTTOM } from '../../../estilos/tema';
import { parsearNumero } from '../../../utilidades/formato';
import { mostrarAlerta } from '../../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<DeudasPersonalStackParamList, 'CrearDeudaPersonal'>;

const CrearDeudaPersonal: React.FC<Props> = ({ navigation }) => {
  const { crear } = useDeudasPersonales();
  const [titulo, setTitulo] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const m = parsearNumero(monto);
    if (!titulo.trim()) {
      mostrarAlerta('Datos', 'Agregá un título');
      return;
    }
    if (m <= 0) {
      mostrarAlerta('Datos', 'El monto original debe ser mayor a 0');
      return;
    }
    setGuardando(true);
    try {
      await crear({ titulo: titulo.trim(), montoOriginal: m, notas: notas.trim() || undefined });
      navigation.goBack();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: PERSONAL.fondo }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: ESPACIADO.md, paddingBottom: SCROLL_FORM_PADDING_BOTTOM }}
          keyboardShouldPersistTaps="handled"
        >
          <CampoTexto etiqueta="Título" placeholder="Ej: Préstamo banco, tarjeta…" value={titulo} onChangeText={setTitulo} icono="document-text-outline" maxLength={120} />
          <CampoTexto etiqueta="Monto total adeudado (Q)" placeholder="0.00" value={monto} onChangeText={setMonto} icono="cash-outline" keyboardType="decimal-pad" />
          <CampoTexto etiqueta="Notas (opcional)" placeholder="Recordatorios" value={notas} onChangeText={setNotas} icono="create-outline" maxLength={500} multiline />
          <BotonPrimario titulo="Guardar deuda" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CrearDeudaPersonal;
