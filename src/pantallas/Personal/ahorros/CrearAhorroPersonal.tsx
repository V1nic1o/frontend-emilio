import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AhorrosPersonalStackParamList } from '../../../navegacion/tipos';
import { useAhorrosPersonales } from '../../../hooks/useAhorrosPersonales';
import CampoTexto from '../../../componentes/CampoTexto';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { PERSONAL } from '../../../estilos/personalTema';
import { estilosComunes, ESPACIADO, SCROLL_FORM_PADDING_BOTTOM } from '../../../estilos/tema';
import { parsearNumero } from '../../../utilidades/formato';

type Props = NativeStackScreenProps<AhorrosPersonalStackParamList, 'CrearAhorroPersonal'>;

const CrearAhorroPersonal: React.FC<Props> = ({ navigation }) => {
  const { crear } = useAhorrosPersonales();
  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [inicial, setInicial] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Datos', 'Agregá un nombre a la meta');
      return;
    }
    const metaNum = meta.trim() ? parsearNumero(meta) : 0;
    const ini = inicial.trim() ? parsearNumero(inicial) : 0;
    if (meta.trim() && metaNum <= 0) {
      Alert.alert('Datos', 'La meta debe ser mayor a 0 o dejala vacía');
      return;
    }
    setGuardando(true);
    try {
      await crear({
        nombre: nombre.trim(),
        metaMonto: metaNum > 0 ? metaNum : undefined,
        montoActual: ini > 0 ? ini : undefined,
      });
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
          <CampoTexto etiqueta="Nombre" placeholder="Ej: Viaje, fondo de emergencia…" value={nombre} onChangeText={setNombre} icono="flag-outline" maxLength={120} />
          <CampoTexto etiqueta="Meta en Q (opcional)" placeholder="Vacío = sin tope" value={meta} onChangeText={setMeta} icono="trophy-outline" keyboardType="decimal-pad" />
          <CampoTexto etiqueta="Monto inicial (opcional)" placeholder="0" value={inicial} onChangeText={setInicial} icono="cash-outline" keyboardType="decimal-pad" />
          <BotonPrimario titulo="Crear meta" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CrearAhorroPersonal;
