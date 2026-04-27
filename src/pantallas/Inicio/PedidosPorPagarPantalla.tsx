import React, { useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { InicioStackParamList, TabParamList } from '../../navegacion/tipos';
import { usePedidos } from '../../hooks/usePedidos';
import { useWallet } from '../../contexto/WalletContext';
import { construirFilasPorPagar, FilaPorPagar } from '../../utilidades/pagosPendientes';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../utilidades/formato';

type Props = NativeStackScreenProps<InicioStackParamList, 'PedidosPorPagar'>;
type TabNav = BottomTabNavigationProp<TabParamList>;

const PedidosPorPagarPantalla: React.FC<Props> = ({ navigation }) => {
  const tabNavigation = useNavigation<TabNav>();
  const { walletSeleccionado } = useWallet();
  const { pedidos, cargar, cargando } = usePedidos();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Por pagar',
      headerBackTitle: '',
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const filas = React.useMemo(() => construirFilasPorPagar(pedidos), [pedidos]);

  const abrirPedido = useCallback(
    (pedidoId: number) => {
      tabNavigation.navigate('PedidosTab', {
        state: {
          routes: [{ name: 'ListaPedidos' }, { name: 'DetallePedido', params: { pedidoId } }],
          index: 1,
        },
      });
    },
    [tabNavigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FilaPorPagar }) => (
      <TouchableOpacity style={estilos.fila} onPress={() => abrirPedido(item.pedidoId)} activeOpacity={0.85}>
        <View style={[estilos.iconoBox, { backgroundColor: COLORES.pendienteClaro }]}>
          <Ionicons
            name={item.modo === 'compra_proveedor' ? 'arrow-down-circle-outline' : 'business-outline'}
            size={22}
            color={COLORES.pendiente}
          />
        </View>
        <View style={estilos.info}>
          <Text style={estilos.nombre} numberOfLines={1}>
            {item.nombreContexto}
          </Text>
          <Text style={estilos.sub} numberOfLines={2}>
            {item.detalleLinea} · {formatearFecha(item.fecha)}
          </Text>
        </View>
        <Text style={estilos.monto}>{formatearMoneda(item.monto)}</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
      </TouchableOpacity>
    ),
    [abrirPedido],
  );

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
        <Text style={estilos.aviso}>Seleccioná un workspace para continuar.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <Text style={estilos.intro}>
        Elegí un ítem para abrir el pedido y registrar pagos a proveedor o en la compra.
      </Text>
      <FlatList
        data={filas}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        contentContainerStyle={filas.length === 0 ? estilos.listaVacia : estilos.lista}
        ListEmptyComponent={
          !cargando ? (
            <View style={estilos.vacio}>
              <Ionicons name="checkmark-done-outline" size={40} color={COLORES.exito} />
              <Text style={estilos.vacioTitulo}>No hay montos por pagar</Text>
              <Text style={estilos.vacioTexto}>Compras y pagos a proveedor en ventas aparecen aquí.</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  intro: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.md,
    lineHeight: 20,
  },
  lista: { paddingHorizontal: ESPACIADO.md, paddingBottom: ESPACIADO.xl },
  listaVacia: { flexGrow: 1, paddingHorizontal: ESPACIADO.md },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  iconoBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  nombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  sub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 3 },
  monto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACIADO.xl * 2,
    paddingHorizontal: ESPACIADO.lg,
  },
  vacioTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginTop: ESPACIADO.md },
  vacioTexto: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center', marginTop: ESPACIADO.xs },
  aviso: { padding: ESPACIADO.md, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default PedidosPorPagarPantalla;
