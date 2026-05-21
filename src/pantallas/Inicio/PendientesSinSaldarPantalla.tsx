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
import { pedidosRequierenAccionInicio, esVentaSoloProveedorSinCliente, tituloVentaParaListado, nombreClienteBajoTituloPedido } from '../../utilidades/pagosPendientes';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../utilidades/formato';
import EstadoBadge from '../../componentes/EstadoBadge';
import { Pedido, AsesoriaPendienteResumen } from '../../tipos';

type Props = NativeStackScreenProps<InicioStackParamList, 'PendientesSinSaldar'>;
type TabNav = BottomTabNavigationProp<TabParamList>;

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function etiquetaAsesoria(anio: number, mes: number) {
  return `${MESES_CORTO[mes - 1] ?? mes} ${anio}`;
}

type Seccion = { titulo: string; data: ({ tipo: 'pedido'; p: Pedido } | { tipo: 'asesoria'; a: AsesoriaPendienteResumen })[] };

const PendientesSinSaldarPantalla: React.FC<Props> = ({ navigation }) => {
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
      title: 'Sin saldar',
      headerBackTitle: '',
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const pedidosPend = useMemo(() => pedidosRequierenAccionInicio(pedidos), [pedidos]);

  const secciones = useMemo((): Seccion[] => {
    const out: Seccion[] = [];
    if (pedidosPend.length > 0) {
      out.push({
        titulo: 'Pedidos',
        data: pedidosPend.map((p) => ({ tipo: 'pedido' as const, p })),
      });
    }
    if (asesoriasPendientes.length > 0) {
      out.push({
        titulo: 'Asesorías mensuales',
        data: asesoriasPendientes.map((a) => ({ tipo: 'asesoria' as const, a })),
      });
    }
    return out;
  }, [pedidosPend, asesoriasPendientes]);

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
    ({
      item,
    }: {
      item: Seccion['data'][number];
    }) => {
      if (item.tipo === 'pedido') {
        const p = item.p;
        const esVenta = p.tipo === 'venta';
        const saldoCliente = p.resumen?.saldoPendiente ?? 0;
        const saldoProv =
          esVenta && p.proveedorId && !esVentaSoloProveedorSinCliente(p) ? (p.resumen?.saldoProveedor ?? 0) : 0;
        const saldoMostrar = saldoCliente > 0 ? saldoCliente : saldoProv;
        const estadoMostrar = saldoCliente > 0
          ? (p.resumen?.estado ?? 'pendiente')
          : (p.resumen?.estadoProveedor ?? 'pendiente');
        const titListado = tituloVentaParaListado(p);
        const lineaCliente = nombreClienteBajoTituloPedido(p, titListado);
        return (
          <TouchableOpacity style={estilos.fila} onPress={() => abrirPedido(p.id)} activeOpacity={0.85}>
            <View style={[estilos.iconoBox, { backgroundColor: esVenta ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
              <Ionicons
                name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                size={20}
                color={esVenta ? COLORES.primario : COLORES.morado}
              />
            </View>
            <View style={estilos.info}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {titListado}
              </Text>
              {lineaCliente ? (
                <Text style={estilos.subCliente} numberOfLines={1}>
                  {lineaCliente}
                </Text>
              ) : null}
              <Text style={estilos.sub}>{formatearFecha(p.fecha)}</Text>
            </View>
            <View style={estilos.der}>
              {p.resumen ? (
                <EstadoBadge
                  estado={estadoMostrar}
                  varianteCobro={esVenta && esVentaSoloProveedorSinCliente(p) && saldoCliente > 0}
                />
              ) : null}
              <Text style={estilos.monto}>{formatearMoneda(saldoMostrar)}</Text>
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
          <View style={[estilos.iconoBox, { backgroundColor: COLORES.primarioClaro }]}>
            <Ionicons name="calendar-outline" size={20} color={COLORES.primario} />
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
  const totalItems = pedidosPend.length + asesoriasPendientes.length;

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
        <Text style={estilos.aviso}>Seleccioná un workspace para continuar.</Text>
      </SafeAreaView>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor={COLORES.primario} />
  );

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <Text style={estilos.intro}>
        Todo lo que figura en el contador «Sin saldar»: tocá un ítem para ir al pedido o a la asesoría mensual.
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
              <Text style={estilos.vacioTitulo}>Nada pendiente</Text>
              <Text style={estilos.vacioTexto}>Cuando haya pedidos o asesorías sin saldar, los verás aquí.</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => (item.tipo === 'pedido' ? `p-${item.p.id}` : `a-${item.a.cobroId}`)}
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
  subCliente: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoMedio,
    color: COLORES.texto,
    marginTop: 2,
  },
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

export default PendientesSinSaldarPantalla;
