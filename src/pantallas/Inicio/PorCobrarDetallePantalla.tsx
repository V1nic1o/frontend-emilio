import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
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
import { useAsesoriasPendientes } from '../../hooks/useAsesorias';
import { useWallet } from '../../contexto/WalletContext';
import { ventasPorCobrarPendientes, tituloVentaParaListado, esVentaSoloProveedorSinCliente } from '../../utilidades/pagosPendientes';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../utilidades/formato';
import EstadoBadge from '../../componentes/EstadoBadge';
import { Pedido, AsesoriaPendienteResumen } from '../../tipos';

type Props = NativeStackScreenProps<InicioStackParamList, 'PorCobrarDetalle'>;
type TabNav = BottomTabNavigationProp<TabParamList>;

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function etiquetaAsesoria(anio: number, mes: number) {
  return `${MESES_CORTO[mes - 1] ?? mes} ${anio}`;
}

type FilaVenta = { tipo: 'venta'; pedido: Pedido; saldo: number };
type FilaAsesoria = { tipo: 'asesoria'; a: AsesoriaPendienteResumen };
type Seccion = { titulo: string; data: (FilaVenta | FilaAsesoria)[] };

const PorCobrarDetallePantalla: React.FC<Props> = ({ navigation }) => {
  const tabNavigation = useNavigation<TabNav>();
  const { walletSeleccionado } = useWallet();
  const { pedidos, cargar: cargarPedidos, cargando: cargandoPedidos } = usePedidos();
  const { pendientes: asesoriasPendientes, cargar: cargarAsesorias, cargando: cargandoAsesorias } =
    useAsesoriasPendientes();

  const cargar = useCallback(async () => {
    await Promise.all([cargarPedidos(), cargarAsesorias()]);
  }, [cargarPedidos, cargarAsesorias]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Por cobrar',
      headerBackTitle: '',
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const ventasList = useMemo(() => ventasPorCobrarPendientes(pedidos), [pedidos]);

  const secciones = useMemo((): Seccion[] => {
    const out: Seccion[] = [];
    if (ventasList.length > 0) {
      out.push({
        titulo: 'Ventas (saldo pendiente)',
        data: ventasList.map(({ pedido, saldo }) => ({ tipo: 'venta' as const, pedido, saldo })),
      });
    }
    if (asesoriasPendientes.length > 0) {
      out.push({
        titulo: 'Asesorías mensuales',
        data: asesoriasPendientes.map((a) => ({ tipo: 'asesoria' as const, a })),
      });
    }
    return out;
  }, [ventasList, asesoriasPendientes]);

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

  const abrirAsesoria = useCallback(
    (personaId: number, personaNombre: string) => {
      tabNavigation.navigate('PersonasTab', {
        screen: 'AsesoriaMensual',
        params: { personaId, personaNombre },
      });
    },
    [tabNavigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FilaVenta | FilaAsesoria }) => {
      if (item.tipo === 'venta') {
        const p = item.pedido;
        const estado = p.resumen?.estado ?? 'pendiente';
        return (
          <TouchableOpacity style={estilos.fila} onPress={() => abrirPedido(p.id)} activeOpacity={0.85}>
            <View style={[estilos.iconoBox, { backgroundColor: COLORES.primarioClaro }]}>
              <Ionicons name="arrow-up-circle-outline" size={20} color={COLORES.primario} />
            </View>
            <View style={estilos.info}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {tituloVentaParaListado(p)}
              </Text>
              <Text style={estilos.sub}>Venta · {formatearFecha(p.fecha)}</Text>
            </View>
            <View style={estilos.der}>
              <EstadoBadge estado={estado} varianteCobro={esVentaSoloProveedorSinCliente(p)} />
              <Text style={estilos.monto}>{formatearMoneda(item.saldo)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
          </TouchableOpacity>
        );
      }
      const a = item.a;
      return (
        <TouchableOpacity
          style={estilos.fila}
          onPress={() => abrirAsesoria(a.personaId, a.personaNombre)}
          activeOpacity={0.85}
        >
          <View style={[estilos.iconoBox, { backgroundColor: COLORES.pagadoClaro }]}>
            <Ionicons name="calendar-outline" size={20} color={COLORES.pagado} />
          </View>
          <View style={estilos.info}>
            <Text style={estilos.nombre} numberOfLines={1}>
              {a.personaNombre}
            </Text>
            <Text style={estilos.sub}>Asesoría · {etiquetaAsesoria(a.anio, a.mes)}</Text>
          </View>
          <View style={estilos.der}>
            <EstadoBadge estado="pendiente" />
            <Text style={estilos.monto}>{formatearMoneda(a.montoTotal)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
        </TouchableOpacity>
      );
    },
    [abrirPedido, abrirAsesoria],
  );

  const refrescando = cargandoPedidos || cargandoAsesorias;
  const totalItems = ventasList.length + asesoriasPendientes.length;
  const refreshControl = (
    <RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor={COLORES.primario} />
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
        Ventas con saldo pendiente del cliente y periodos de asesoría sin cobrar. Tocá un ítem para abrir el detalle.
      </Text>
      {totalItems === 0 ? (
        <ScrollView
          contentContainerStyle={estilos.listaVacia}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {!refrescando ? (
            <View style={estilos.vacio}>
              <Ionicons name="checkmark-done-outline" size={40} color={COLORES.exito} />
              <Text style={estilos.vacioTitulo}>Nada por cobrar aquí</Text>
              <Text style={estilos.vacioTexto}>Si ya registraste cobros, el listado se vacía. Tirá hacia abajo para actualizar.</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => (item.tipo === 'venta' ? `v-${item.pedido.id}` : `a-${item.a.cobroId}`)}
          renderItem={renderItem}
          renderSectionHeader={({ section: { titulo } }) => (
            <Text style={estilos.seccionTitulo}>{titulo}</Text>
          )}
          refreshControl={refreshControl}
          contentContainerStyle={estilos.lista}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  seccionTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: ESPACIADO.sm,
    marginTop: ESPACIADO.sm,
  },
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
  der: { alignItems: 'flex-end', gap: 4 },
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

export default PorCobrarDetallePantalla;
