import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DeudasPersonalStackParamList } from '../../../navegacion/tipos';
import { useDeudasPersonales } from '../../../hooks/useDeudasPersonales';
import CampoTexto from '../../../componentes/CampoTexto';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { COLORES } from '../../../estilos/colores';
import { PERSONAL } from '../../../estilos/personalTema';
import { estilosComunes, ESPACIADO, SCROLL_FORM_PADDING_BOTTOM, FUENTE } from '../../../estilos/tema';
import { parsearNumero, formatearMoneda } from '../../../utilidades/formato';

type Props = NativeStackScreenProps<DeudasPersonalStackParamList, 'EditarDeudaPersonal'>;

function fechaAInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EditarDeudaPersonal: React.FC<Props> = ({ navigation, route }) => {
  const { deudaId } = route.params;
  const { deudas, cargar, actualizar } = useDeudasPersonales();
  const [titulo, setTitulo] = useState('');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [notas, setNotas] = useState('');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);

  const aplicar = useCallback(() => {
    const d = deudas.find((x) => x.id === deudaId);
    if (!d) return;
    setTitulo(d.titulo);
    setMontoOriginal(String(d.montoOriginal));
    setNotas(d.notas ?? '');
    setFecha(fechaAInput(d.fecha));
  }, [deudas, deudaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    aplicar();
  }, [aplicar]);

  useEffect(() => {
    if (deudas.length > 0 && !deudas.some((x) => x.id === deudaId)) {
      Alert.alert('No encontrado', 'Esta deuda ya no existe.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }, [deudas, deudaId, navigation]);

  const guardar = async () => {
    if (!titulo.trim()) {
      Alert.alert('Datos', 'Agregá un título');
      return;
    }
    const orig = parsearNumero(montoOriginal);
    if (orig <= 0) {
      Alert.alert('Datos', 'El monto total debe ser mayor a 0');
      return;
    }
    const fechaTrim = fecha.trim();
    if (!fechaTrim || !/^\d{4}-\d{2}-\d{2}$/.test(fechaTrim)) {
      Alert.alert('Fecha', 'Ingresá la fecha en formato AAAA-MM-DD');
      return;
    }
    setGuardando(true);
    try {
      await actualizar(deudaId, {
        titulo: titulo.trim(),
        montoOriginal: orig,
        notas: notas.trim() || undefined,
        fecha: `${fechaTrim}T12:00:00.000Z`,
      });
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const item = deudas.find((x) => x.id === deudaId);

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: PERSONAL.fondo }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: ESPACIADO.md, paddingBottom: SCROLL_FORM_PADDING_BOTTOM }}
          keyboardShouldPersistTaps="handled"
        >
          {item != null && (
            <Text style={estilos.aviso}>
              Ya abonado: {formatearMoneda(item.montoPagado)}. Si bajás el monto total por debajo de lo abonado, el
              abonado se ajusta solo.
            </Text>
          )}
          <CampoTexto
            etiqueta="Título"
            placeholder="Ej: Préstamo, tarjeta…"
            value={titulo}
            onChangeText={setTitulo}
            icono="document-text-outline"
            maxLength={120}
          />
          <CampoTexto
            etiqueta="Monto total adeudado (Q)"
            placeholder="0.00"
            value={montoOriginal}
            onChangeText={setMontoOriginal}
            icono="cash-outline"
            keyboardType="decimal-pad"
          />
          <CampoTexto
            etiqueta="Fecha de referencia (AAAA-MM-DD)"
            placeholder="2026-04-15"
            value={fecha}
            onChangeText={setFecha}
            icono="calendar-outline"
            autoCapitalize="none"
          />
          <CampoTexto
            etiqueta="Notas (opcional)"
            placeholder="Recordatorios"
            value={notas}
            onChangeText={setNotas}
            icono="create-outline"
            maxLength={500}
            multiline
          />
          <BotonPrimario titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  aviso: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.md,
    lineHeight: 20,
  },
});

export default EditarDeudaPersonal;
