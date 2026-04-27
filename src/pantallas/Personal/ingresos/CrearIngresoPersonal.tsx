import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IngresosPersonalStackParamList } from '../../../navegacion/tipos';
import { useIngresosPersonales } from '../../../hooks/useIngresosPersonales';
import CampoTexto from '../../../componentes/CampoTexto';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { COLORES } from '../../../estilos/colores';
import { PERSONAL } from '../../../estilos/personalTema';
import { ESPACIADO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../../estilos/tema';
import { parsearNumero } from '../../../utilidades/formato';

type Props = NativeStackScreenProps<IngresosPersonalStackParamList, 'CrearIngresoPersonal'>;

const CrearIngresoPersonal: React.FC<Props> = ({ navigation }) => {
  const { crear } = useIngresosPersonales();
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const m = parsearNumero(monto);
    if (!descripcion.trim()) {
      Alert.alert('Datos', 'Agregá una descripción');
      return;
    }
    if (m <= 0) {
      Alert.alert('Datos', 'El monto debe ser mayor a 0');
      return;
    }
    setGuardando(true);
    try {
      await crear({ descripcion: descripcion.trim(), monto: m });
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
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
          <CampoTexto
            etiqueta="Descripción"
            placeholder="Ej: Salario, freelance…"
            value={descripcion}
            onChangeText={setDescripcion}
            icono="create-outline"
            maxLength={200}
          />
          <CampoTexto
            etiqueta="Monto (Q)"
            placeholder="0.00"
            value={monto}
            onChangeText={setMonto}
            icono="cash-outline"
            keyboardType="decimal-pad"
          />
          <BotonPrimario titulo="Guardar ingreso" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CrearIngresoPersonal;
