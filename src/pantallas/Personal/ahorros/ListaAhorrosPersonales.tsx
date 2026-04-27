import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AhorrosPersonalStackParamList } from '../../../navegacion/tipos';
import { useAhorrosPersonales } from '../../../hooks/useAhorrosPersonales';
import { AhorroPersonal } from '../../../tipos';
import CargandoSpinner from '../../../componentes/CargandoSpinner';
import ErrorMensaje from '../../../componentes/ErrorMensaje';
import FAB from '../../../componentes/FAB';
import BotonPrimario from '../../../componentes/BotonPrimario';
import { COLORES } from '../../../estilos/colores';
import { PERSONAL } from '../../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../../estilos/tema';
import { formatearMoneda, parsearNumero } from '../../../utilidades/formato';

type Props = NativeStackScreenProps<AhorrosPersonalStackParamList, 'ListaAhorrosPersonales'>;

const ListaAhorrosPersonales: React.FC<Props> = ({ navigation }) => {
  const { ahorros, cargando, error, cargar, actualizar, eliminar } = useAhorrosPersonales();
  const [modal, setModal] = useState<AhorroPersonal | null>(null);
  const [sumTxt, setSumTxt] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const u = navigation.addListener('focus', cargar);
    return u;
  }, [navigation, cargar]);

  const sumar = async () => {
    if (!modal) return;
    const s = parsearNumero(sumTxt);
    if (s <= 0) {
      Alert.alert('Monto inválido', 'Ingresá un monto mayor a 0');
      return;
    }
    setGuardando(true);
    try {
      await actualizar(modal.id, { montoActual: modal.montoActual + s });
      setModal(null);
      setSumTxt('');
      await cargar();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : '');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && ahorros.length === 0) return <CargandoSpinner />;
  if (error && ahorros.length === 0) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: PERSONAL.fondo }]} edges={['bottom']}>
      <FlatList
        data={ahorros}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <Ionicons name="wallet-outline" size={40} color={COLORES.textoDeshabilitado} />
            <Text style={estilos.vacioTxt}>Creá metas de ahorro y registrá depósitos</Text>
          </View>
        }
        renderItem={({ item }) => {
          const metaTxt = item.metaMonto != null && item.metaMonto > 0
            ? `Meta: ${formatearMoneda(item.metaMonto)}`
            : 'Sin meta fija';
          const pct = item.metaMonto && item.metaMonto > 0
            ? Math.min(100, Math.round((item.montoActual / item.metaMonto) * 100))
            : null;
          return (
            <View style={estilos.card}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.meta}>{metaTxt}</Text>
                <Text style={estilos.monto}>Actual: {formatearMoneda(item.montoActual)}</Text>
                {pct != null ? <Text style={estilos.pct}>{pct}% de la meta</Text> : null}
              </View>
              <View style={estilos.acc}>
                <TouchableOpacity style={estilos.btn} onPress={() => { setModal(item); setSumTxt(''); }} activeOpacity={0.85}>
                  <Text style={estilos.btnTxt}>Sumar</Text>
                </TouchableOpacity>
                <View style={estilos.iconosFila}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('EditarAhorroPersonal', { ahorroId: item.id })}
                    hitSlop={10}
                    accessibilityLabel="Editar meta de ahorro"
                  >
                    <Ionicons name="create-outline" size={20} color={COLORES.primario} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Eliminar', `¿Quitar «${item.nombre}»?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => void eliminar(item.id).catch(() => {}) },
                      ]);
                    }}
                    hitSlop={10}
                    accessibilityLabel="Eliminar meta"
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORES.peligro} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('CrearAhorroPersonal')} />

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.modalFondo}>
          <View style={estilos.modalCaja}>
            <Text style={estilos.modalTit}>Sumar al ahorro</Text>
            <Text style={estilos.modalSub} numberOfLines={2}>{modal?.nombre}</Text>
            <TextInput
              style={estilos.input}
              placeholder="Monto (Q)"
              keyboardType="decimal-pad"
              value={sumTxt}
              onChangeText={setSumTxt}
              placeholderTextColor={COLORES.textoDeshabilitado}
            />
            <View style={estilos.row}>
              <TouchableOpacity style={estilos.modalCancel} onPress={() => setModal(null)}>
                <Text style={{ color: COLORES.textoSecundario, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <BotonPrimario titulo="Guardar" onPress={sumar} cargando={guardando} />
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
  },
  nombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  meta: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  monto: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold, color: '#7C3AED', marginTop: 4 },
  pct: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  acc: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  iconosFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIO.md },
  btnTxt: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: '#7C3AED' },
  vacio: { padding: ESPACIADO.xl, alignItems: 'center', gap: ESPACIADO.sm },
  vacioTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: ESPACIADO.lg },
  modalCaja: { backgroundColor: COLORES.tarjeta, borderRadius: RADIO.xl, padding: ESPACIADO.lg },
  modalTit: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  modalSub: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginVertical: ESPACIADO.sm },
  input: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: RADIO.md,
    padding: 12,
    fontSize: FUENTE.tamanoBase,
    color: COLORES.texto,
    marginBottom: ESPACIADO.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 8 },
});

export default ListaAhorrosPersonales;
