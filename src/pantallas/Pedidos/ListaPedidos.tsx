import React, { useCallback, useState, useMemo } from 'react';
import { useFocusEffect, StackActions } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PedidosStackParamList } from '../../navegacion/tipos';
import { usePedidos } from '../../hooks/usePedidos';
import { Pedido } from '../../tipos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import FAB from '../../componentes/FAB';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha, etiquetaPedido, subtituloNumeroPedido } from '../../utilidades/formato';
import { esVentaSoloProveedorSinCliente } from '../../utilidades/pagosPendientes';

type Props = NativeStackScreenProps<PedidosStackParamList, 'ListaPedidos'>;
type Filtro = 'todos' | 'ventas' | 'compras' | 'pendientes';

const FILTROS: { id: Filtro; etiqueta: string; icono: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'todos', etiqueta: 'Todos', icono: 'apps-outline' },
  { id: 'ventas', etiqueta: 'Ventas', icono: 'arrow-up-circle-outline' },
  { id: 'compras', etiqueta: 'Compras', icono: 'arrow-down-circle-outline' },
  { id: 'pendientes', etiqueta: 'Pendientes', icono: 'time-outline' },
];

const ESTADO_CONFIG = {
  pagado: { label: 'Pagado', color: COLORES.exito, fondo: COLORES.exitoClaro, icono: 'checkmark-circle' as const },
  parcial: { label: 'Parcial', color: '#D97706', fondo: '#FEF3C7', icono: 'ellipse-outline' as const },
  pendiente: { label: 'Pendiente', color: COLORES.peligro, fondo: '#FFF1F0', icono: 'time-outline' as const },
};

/** Mismas etiquetas que `EstadoBadge` con `varianteCobro` (venta solo proveedor). */
const ESTADO_CONFIG_COBRO = {
  pagado: { label: 'Cobrado', color: COLORES.exito, fondo: COLORES.exitoClaro, icono: 'checkmark-circle' as const },
  parcial: { label: 'Cobro parcial', color: '#D97706', fondo: '#FEF3C7', icono: 'ellipse-outline' as const },
  pendiente: { label: 'Sin cobrar', color: COLORES.peligro, fondo: '#FFF1F0', icono: 'time-outline' as const },
};

const ListaPedidos: React.FC<Props> = ({ navigation }) => {
  const { pedidos, cargando, error, cargar } = usePedidos();
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('todos');

  useFocusEffect(
    useCallback(() => {
      cargar();
      // Solo si hay rutas encima de la lista (p. ej. [Lista, Detalle, Lista]), volver a la raíz.
      // Con un solo [ListaPedidos], popToTop no está soportado y React Navigation lanza error.
      const st = navigation.getState();
      const idx = st?.index ?? 0;
      const nombre = st?.routes?.[idx]?.name;
      if (idx > 0 && nombre === 'ListaPedidos') {
        navigation.dispatch(StackActions.popToTop());
      }
    }, [cargar, navigation]),
  );

  const pedidosFiltrados = useMemo(() => {
    switch (filtroActivo) {
      case 'ventas': return pedidos.filter((p) => p.tipo === 'venta');
      case 'compras': return pedidos.filter((p) => p.tipo === 'compra');
      case 'pendientes': return pedidos.filter(
        (p) => p.resumen?.estado === 'pendiente' || p.resumen?.estado === 'parcial'
      );
      default: return pedidos;
    }
  }, [pedidos, filtroActivo]);

  const conteos = useMemo(() => ({
    todos: pedidos.length,
    ventas: pedidos.filter((p) => p.tipo === 'venta').length,
    compras: pedidos.filter((p) => p.tipo === 'compra').length,
    pendientes: pedidos.filter((p) => p.resumen?.estado === 'pendiente' || p.resumen?.estado === 'parcial').length,
  }), [pedidos]);

  // Totales globales para las estadísticas
  const totales = useMemo(() => {
    const totalVentas = pedidos
      .filter((p) => p.tipo === 'venta')
      .reduce((acc, p) => acc + (p.resumen?.totalVenta ?? 0), 0);
    const totalPendiente = pedidos.reduce(
      (acc, p) => acc + Math.max(0, p.resumen?.saldoPendiente ?? 0),
      0,
    );
    return { totalVentas, totalPendiente };
  }, [pedidos]);

  const renderPedido = useCallback(
    ({ item }: { item: Pedido }) => {
      const esVenta = item.tipo === 'venta';
      const esInter = esVentaSoloProveedorSinCliente(item);
      const refBarra = esVenta
        ? esInter
          ? (item.resumen?.referenciaSaldoCliente ?? item.resumen?.totalVenta ?? 0)
          : (item.resumen?.totalVenta ?? 0)
        : (item.resumen?.totalCompra ?? 0);
      const pagado = item.resumen?.totalPagado ?? 0;
      const saldo = item.resumen?.saldoPendiente ?? Math.max(0, refBarra - pagado);
      const porcentaje = refBarra > 0 ? Math.min(100, Math.round((pagado / refBarra) * 100)) : 0;
      const estadoKey = (item.resumen?.estado ?? 'pendiente') as keyof typeof ESTADO_CONFIG;
      const tablaEstado = esInter ? ESTADO_CONFIG_COBRO : ESTADO_CONFIG;
      const estadoCfg = tablaEstado[estadoKey] ?? tablaEstado.pendiente;

      const colorTipo = esVenta ? COLORES.primario : COLORES.morado;
      const fondoTipo = esVenta ? COLORES.primarioClaro : COLORES.moradoClaro;
      const subNum = subtituloNumeroPedido(item);

      return (
        <TouchableOpacity
          style={estilos.card}
          onPress={() => navigation.navigate('DetallePedido', { pedidoId: item.id })}
          activeOpacity={0.85}
        >
          {/* Cabecera de la card */}
          <View style={estilos.cardHeader}>
            <View style={estilos.cardHeaderLeft}>
              <View style={[estilos.tipoIconBox, { backgroundColor: fondoTipo }]}>
                <Ionicons
                  name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                  size={18}
                  color={colorTipo}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[estilos.tipoTexto, { color: colorTipo }]} numberOfLines={2}>
                  {etiquetaPedido(item)}
                </Text>
                {subNum ? (
                  <Text style={estilos.pedidoSubId} numberOfLines={1}>{subNum}</Text>
                ) : null}
                <Text style={estilos.fecha}>{formatearFecha(item.fecha)}</Text>
              </View>
            </View>

            <View style={[estilos.estadoBadge, { backgroundColor: estadoCfg.fondo }]}>
              <Ionicons name={estadoCfg.icono} size={11} color={estadoCfg.color} />
              <Text style={[estilos.estadoTexto, { color: estadoCfg.color }]} numberOfLines={1}>
                {estadoCfg.label}
              </Text>
            </View>
          </View>

          {/* Nombre persona */}
          <Text style={estilos.personaNombre} numberOfLines={1}>
            {item.persona?.nombre ??
              (item.tipo === 'venta' && item.proveedor?.nombre ? item.proveedor.nombre : '—')}
          </Text>

          {/* Barra de progreso + totales */}
          <View style={estilos.cardFooter}>
            <View style={estilos.progressWrapper}>
              <View style={estilos.progressBg}>
                <View
                  style={[
                    estilos.progressBar,
                    {
                      width: `${porcentaje}%` as `${number}%`,
                      backgroundColor: estadoCfg.color,
                    },
                  ]}
                />
              </View>
              <Text style={estilos.progressPct}>{porcentaje}%</Text>
            </View>
            <View style={estilos.totalArea}>
              <Text style={estilos.totalLabel}>
                {saldo > 0 ? 'Saldo' : 'Total'}
              </Text>
              <Text style={[estilos.totalMonto, saldo > 0 && { color: COLORES.peligro }]}>
                {formatearMoneda(saldo > 0 ? saldo : refBarra)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  if (cargando && pedidos.length === 0) return <CargandoSpinner />;
  if (error && pedidos.length === 0) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      {/* Filtros */}
      <View style={estilos.filtrosWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtrosScroll}
        >
          {FILTROS.map((f) => {
            const activo = filtroActivo === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[estilos.filtroBtn, activo && estilos.filtroBtnActivo]}
                onPress={() => setFiltroActivo(f.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f.icono}
                  size={13}
                  color={activo ? COLORES.blanco : COLORES.textoSecundario}
                />
                <Text style={[estilos.filtroTexto, activo && estilos.filtroTextoActivo]}>
                  {f.etiqueta}
                </Text>
                {conteos[f.id] > 0 && (
                  <View style={[estilos.filtroBadge, activo && estilos.filtroBadgeActivo]}>
                    <Text style={[estilos.filtroBadgeTexto, activo && estilos.filtroBadgeTextoActivo]}>
                      {conteos[f.id]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={pedidosFiltrados}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPedido}
        contentContainerStyle={[estilos.lista, pedidosFiltrados.length === 0 && estilos.listaVacia]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: ESPACIADO.sm }} />}
        ListHeaderComponent={
          pedidos.length > 0 && filtroActivo === 'todos' ? (
            <View style={estilos.statsRow}>
              <View style={estilos.statCard}>
                <Ionicons name="cube-outline" size={18} color={COLORES.primario} />
                <Text style={estilos.statNum}>{pedidos.length}</Text>
                <Text style={estilos.statLabel}>Pedidos</Text>
              </View>
              <View style={estilos.statCard}>
                <Ionicons name="arrow-up-circle-outline" size={18} color={COLORES.primario} />
                <Text style={estilos.statNum} numberOfLines={1}>{formatearMoneda(totales.totalVentas)}</Text>
                <Text style={estilos.statLabel}>En ventas</Text>
              </View>
              <View style={estilos.statCard}>
                <Ionicons name="time-outline" size={18} color={COLORES.peligro} />
                <Text style={[estilos.statNum, { color: COLORES.peligro }]} numberOfLines={1}>{formatearMoneda(totales.totalPendiente)}</Text>
                <Text style={estilos.statLabel}>Pendiente</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={estilos.vacioIconBox}>
              <Ionicons name="cube-outline" size={44} color={COLORES.textoDeshabilitado} />
            </View>
            <Text style={estilos.vacioTitulo}>
              {filtroActivo === 'todos' ? 'Sin pedidos aún' : `Sin ${filtroActivo}`}
            </Text>
            <Text style={estilos.vacioTexto}>
              {filtroActivo === 'pendientes'
                ? '¡Todos los pedidos están al día!'
                : 'Tocá + para crear tu primer pedido'}
            </Text>
          </View>
        }
      />
      <FAB onPress={() => navigation.navigate('CrearPedido', {})} />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  // Filtros
  filtrosWrapper: {
    backgroundColor: COLORES.tarjeta,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  filtrosScroll: {
    paddingHorizontal: ESPACIADO.md,
    paddingVertical: ESPACIADO.sm,
    gap: ESPACIADO.xs,
  },
  filtroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIO.full,
    paddingVertical: 7,
    paddingHorizontal: ESPACIADO.sm,
    backgroundColor: COLORES.grisClaro,
    marginRight: 4,
  },
  filtroBtnActivo: { backgroundColor: COLORES.primario },
  filtroTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
  },
  filtroTextoActivo: { color: COLORES.blanco },
  filtroBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filtroBadgeActivo: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filtroBadgeTexto: { fontSize: 10, fontWeight: FUENTE.pesoBold, color: COLORES.textoSecundario },
  filtroBadgeTextoActivo: { color: COLORES.blanco },

  lista: { padding: ESPACIADO.md, paddingBottom: 100 },
  listaVacia: { flex: 1 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    marginBottom: ESPACIADO.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.sm,
    alignItems: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNum: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  statLabel: {
    fontSize: 10,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoSemibold,
  },

  // Card pedido
  card: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: ESPACIADO.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIADO.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
  },
  tipoIconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIO.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedidoSubId: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 2,
    fontWeight: FUENTE.pesoMedio,
  },
  tipoTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
  },
  fecha: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 1,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    borderRadius: RADIO.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  estadoTexto: {
    fontSize: 10,
    fontWeight: FUENTE.pesoBold,
  },
  personaNombre: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
  },
  progressWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.xs,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: COLORES.grisClaro,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoSemibold,
    minWidth: 28,
    textAlign: 'right',
  },
  totalArea: { alignItems: 'flex-end' },
  totalLabel: {
    fontSize: 9,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoSemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalMonto: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },

  // Vacío
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACIADO.xl },
  vacioIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.md,
  },
  vacioTitulo: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: 6,
  },
  vacioTexto: {
    fontSize: FUENTE.tamanoBase,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ListaPedidos;
