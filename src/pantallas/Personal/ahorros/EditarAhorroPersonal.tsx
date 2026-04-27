import React, { useEffect, useState, useCallback } from 'react';
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

type Props = NativeStackScreenProps<AhorrosPersonalStackParamList, 'EditarAhorroPersonal'>;

const EditarAhorroPersonal: React.FC<Props> = ({ navigation, route }) => {
  const { ahorroId } = route.params;
  const { ahorros, cargar, actualizar } = useAhorrosPersonales();
  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [montoActual, setMontoActual] = useState('');
  const [guardando, setGuardando] = useState(false);

  const aplicar = useCallback(() => {
    const a = ahorros.find((x) => x.id === ahorroId);
    if (!a) return;
    setNombre(a.nombre);
    setMeta(a.metaMonto != null && a.metaMonto > 0 ? String(a.metaMonto) : '');
    setMontoActual(String(a.montoActual));
  }, [ahorros, ahorroId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    aplicar();
  }, [aplicar]);

  useEffect(() => {
    if (ahorros.length > 0 && !ahorros.some((x) => x.id === ahorroId)) {
      Alert.alert('No encontrado', 'Esta meta ya no existe.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }, [ahorros, ahorroId, navigation]);

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Datos', 'Agregá un nombre');
      return;
    }
    const metaNum = meta.trim() ? parsearNumero(meta) : 0;
    const act = parsearNumero(montoActual);
    if (meta.trim() && metaNum <= 0) {
      Alert.alert('Datos', 'La meta debe ser mayor a 0 o dejala vacía');
      return;
    }
    if (act < 0) {
      Alert.alert('Datos', 'El monto actual no puede ser negativo');
      return;
    }
    setGuardando(true);
    try {
      await actualizar(ahorroId, {
        nombre: nombre.trim(),
        metaMonto: meta.trim() ? metaNum : null,
        montoActual: act,
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
          <CampoTexto
            etiqueta="Nombre"
            placeholder="Ej: Viaje, emergencia…"
            value={nombre}
            onChangeText={setNombre}
            icono="flag-outline"
            maxLength={120}
          />
          <CampoTexto
            etiqueta="Meta en Q (opcional)"
            placeholder="Vacío = sin tope"
            value={meta}
            onChangeText={setMeta}
            icono="trophy-outline"
            keyboardType="decimal-pad"
          />
          <CampoTexto
            etiqueta="Monto ahorrado a la fecha (Q)"
            placeholder="0"
            value={montoActual}
            onChangeText={setMontoActual}
            icono="cash-outline"
            keyboardType="decimal-pad"
            ayuda="Corregí el total si registraste mal un depósito o querés alinear con tu banco."
          />
          <BotonPrimario titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditarAhorroPersonal;
