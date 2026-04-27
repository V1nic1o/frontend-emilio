import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IngresosPersonalStackParamList } from '../../../navegacion/tipos';
import { useIngresosPersonales } from '../../../hooks/useIngresosPersonales';
import CampoTexto from '../../../componentes/CampoTexto';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { PERSONAL } from '../../../estilos/personalTema';
import { estilosComunes, ESPACIADO, SCROLL_FORM_PADDING_BOTTOM } from '../../../estilos/tema';
import { parsearNumero } from '../../../utilidades/formato';

type Props = NativeStackScreenProps<IngresosPersonalStackParamList, 'EditarIngresoPersonal'>;

function fechaAInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EditarIngresoPersonal: React.FC<Props> = ({ navigation, route }) => {
  const { ingresoId } = route.params;
  const { ingresos, cargar, actualizar } = useIngresosPersonales();
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);

  const aplicarItem = useCallback(() => {
    const item = ingresos.find((x) => x.id === ingresoId);
    if (!item) return;
    setDescripcion(item.descripcion);
    setMonto(String(item.monto));
    setFecha(fechaAInput(item.fecha));
  }, [ingresos, ingresoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    aplicarItem();
  }, [aplicarItem]);

  useEffect(() => {
    if (ingresos.length > 0 && !ingresos.some((x) => x.id === ingresoId)) {
      Alert.alert('No encontrado', 'Este ingreso ya no existe.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }, [ingresos, ingresoId, navigation]);

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
    const fechaTrim = fecha.trim();
    if (!fechaTrim || !/^\d{4}-\d{2}-\d{2}$/.test(fechaTrim)) {
      Alert.alert('Fecha', 'Ingresá la fecha en formato AAAA-MM-DD');
      return;
    }
    setGuardando(true);
    try {
      await actualizar(ingresoId, {
        descripcion: descripcion.trim(),
        monto: m,
        fecha: `${fechaTrim}T12:00:00.000Z`,
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
          <CampoTexto
            etiqueta="Fecha (AAAA-MM-DD)"
            placeholder="2026-04-15"
            value={fecha}
            onChangeText={setFecha}
            icono="calendar-outline"
            autoCapitalize="none"
            ayuda="La fecha en que contás este ingreso (afecta el resumen del mes)."
          />
          <BotonPrimario titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditarIngresoPersonal;
