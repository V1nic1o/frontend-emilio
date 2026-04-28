import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { DeudasPersonalStackParamList } from '../../../navegacion/tipos';
import { useDeudasPersonales } from '../../../hooks/useDeudasPersonales';
import { DeudaPersonal } from '../../../tipos';
import CargandoSpinner from '../../../componentes/CargandoSpinner';
import ErrorMensaje from '../../../componentes/ErrorMensaje';
import FAB from '../../../componentes/FAB';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { COLORES } from '../../../estilos/colores';
import { PERSONAL } from '../../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../../estilos/tema';
import { formatearMoneda, formatearFecha, parsearNumero } from '../../../utilidades/formato';
import { mostrarAlerta, confirmarYEntonces } from '../../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<DeudasPersonalStackParamList, 'ListaDeudasPersonales'>;

const ListaDeudasPersonales: React.FC<Props> = ({ navigation }) => {
  const { deudas, cargando, error, cargar, actualizar, eliminar } = useDeudasPersonales();
  const [modal, setModal] = useState<DeudaPersonal | null>(null);
  const [pagoTxt, setPagoTxt] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);

  useEffect(() => {
    const u = navigation.addListener('focus', cargar);
    return u;
  }, [navigation, cargar]);

  const aplicarPago = async () => {
    if (!modal) return;
    const extra = parsearNumero(pagoTxt);
    if (extra <= 0) {
      mostrarAlerta('Monto inválido', 'Ingresá un monto mayor a 0');
      return;
    }
    const nuevoPagado = Math.min(modal.montoOriginal, modal.montoPagado + extra);
    setGuardandoPago(true);
    try {
      await actualizar(modal.id, { montoPagado: nuevoPagado });
      setModal(null);
      setPagoTxt('');
      await cargar();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setGuardandoPago(false);
    }
  };

  const onEliminar = (d: DeudaPersonal) => {
    confirmarYEntonces(
      'Eliminar',
      `¿Eliminar la deuda «${d.titulo}»?`,
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await eliminar(d.id);
        } catch (e: unknown) {
          mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
        }
      },
    );
  };

  if (cargando && deudas.length === 0) return <CargandoSpinner />;
  if (error && deudas.length === 0) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: PERSONAL.fondo }]} edges={['bottom']}>
      <FlatList
        data={deudas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <Ionicons name="document-text-outline" size={40} color={COLORES.textoDeshabilitado} />
            <Text style={estilos.vacioTxt}>No tenés deudas registradas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pend = Math.max(0, item.montoOriginal - item.montoPagado);
          return (
            <View style={estilos.card}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.tit}>{item.titulo}</Text>
                <Text style={estilos.meta}>{formatearFecha(item.fecha)}</Text>
                <Text style={estilos.meta}>Original: {formatearMoneda(item.montoOriginal)} · Pagado: {formatearMoneda(item.montoPagado)}</Text>
                <Text style={[estilos.pend, pend > 0 ? { color: COLORES.peligro } : { color: '#059669' }]}>
                  Pendiente: {formatearMoneda(pend)}
                </Text>
              </View>
              <View style={estilos.acciones}>
                {pend > 0 ? (
                  <TouchableOpacity style={estilos.btnPago} onPress={() => { setModal(item); setPagoTxt(''); }} activeOpacity={0.85}>
                    <Text style={estilos.btnPagoTxt}>Abonar</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={estilos.iconosFila}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('EditarDeudaPersonal', { deudaId: item.id })}
                    hitSlop={10}
                    accessibilityLabel="Editar deuda"
                  >
                    <Ionicons name="create-outline" size={20} color={COLORES.primario} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onEliminar(item)} hitSlop={10} accessibilityLabel="Eliminar deuda">
                    <Ionicons name="trash-outline" size={18} color={COLORES.peligro} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('CrearDeudaPersonal')} />

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.modalFondo}>
          <View style={estilos.modalCaja}>
            <Text style={estilos.modalTit}>Registrar abono</Text>
            <Text style={estilos.modalSub} numberOfLines={2}>{modal?.titulo}</Text>
            <TextInput
              style={estilos.input}
              placeholder="Monto a abonar (Q)"
              keyboardType="decimal-pad"
              value={pagoTxt}
              onChangeText={setPagoTxt}
              placeholderTextColor={COLORES.textoDeshabilitado}
            />
            <View style={estilos.modalBtns}>
              <TouchableOpacity style={estilos.modalCancel} onPress={() => setModal(null)}>
                <Text style={{ color: COLORES.textoSecundario, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <BotonPrimario titulo="Aplicar" onPress={aplicarPago} cargando={guardandoPago} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORES.tarjeta,
    padding: ESPACIADO.md,
    borderRadius: RADIO.lg,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
    gap: ESPACIADO.sm,
  },
  tit: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  meta: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  pend: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, marginTop: 4 },
  acciones: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  iconosFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnPago: { backgroundColor: COLORES.primarioClaro, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIO.md },
  btnPagoTxt: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.primario },
  vacio: { padding: ESPACIADO.xl, alignItems: 'center', gap: ESPACIADO.sm },
  vacioTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: ESPACIADO.lg },
  modalCaja: { backgroundColor: COLORES.tarjeta, borderRadius: RADIO.xl, padding: ESPACIADO.lg },
  modalTit: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  modalSub: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginTop: 6, marginBottom: ESPACIADO.md },
  input: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: RADIO.md,
    padding: 12,
    fontSize: FUENTE.tamanoBase,
    color: COLORES.texto,
    marginBottom: ESPACIADO.md,
  },
  modalBtns: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 8 },
});

export default ListaDeudasPersonales;
