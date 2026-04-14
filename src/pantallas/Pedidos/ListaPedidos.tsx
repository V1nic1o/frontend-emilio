import React, { useEffect, useCallback, useState, useMemo } from 'react';
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
import EstadoBadge from '../../componentes/EstadoBadge';
import FAB from '../../componentes/FAB';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../utilidades/formato';

type Props = NativeStackScreenProps<PedidosStackParamList, 'ListaPedidos'>;
type Filtro = 'todos' | 'ventas' | 'compras' | 'pendientes';

const FILTROS: { id: Filtro; etiqueta: string; icono: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'todos', etiqueta: 'Todos', icono: 'apps-outline' },
  { id: 'ventas', etiqueta: 'Ventas', icono: 'arrow-up-circle-outline' },
  { id: 'compras', etiqueta: 'Compras', icono: 'arrow-down-circle-outline' },
  { id: 'pendientes', etiqueta: 'Sin pagar', icono: 'time-outline' },
];

const ListaPedidos: React.FC<Props> = ({ navigation }) => {
  const { pedidos, cargando, error, cargar } = usePedidos();
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('todos');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargar);
    return unsubscribe;
  }, [navigation, cargar]);

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

  const renderPedido = useCallback(
    ({ item }: { item: Pedido }) => {
      const esVenta = item.tipo === 'venta';
      const total = esVenta ? (item.resumen?.totalVenta ?? 0) : (item.resumen?.totalCompra ?? 0);
      const saldo = Math.max(0, total - (item.resumen?.totalPagado ?? 0));
      return (
        <TouchableOpacity
          style={estilos.item}
          onPress={() => navigation.navigate('DetallePedido', { pedidoId: item.id })}
          activeOpacity={0.85}
        >
          <View style={[estilos.tipoIconBox, { backgroundColor: esVenta ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
            <Ionicons
              name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
              size={22}
              color={esVenta ? COLORES.primario : COLORES.morado}
            />
          </View>
          <View style={estilos.itemInfo}>
            <Text style={estilos.persona} numberOfLines={1}>{item.persona?.nombre ?? '—'}</Text>
            <View style={estilos.metaFila}>
              <View style={[estilos.tipoBadge, { backgroundColor: esVenta ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                <Text style={[estilos.tipoBadgeTexto, { color: esVenta ? COLORES.primario : COLORES.morado }]}>
                  {esVenta ? 'Venta' : 'Compra'}
                </Text>
              </View>
              <Text style={estilos.metaSep}>·</Text>
              <Text style={estilos.fecha}>{formatearFecha(item.fecha)}</Text>
            </View>
          </View>
          <View style={estilos.itemRight}>
            {item.resumen && <EstadoBadge estado={item.resumen.estado} />}
            <Text style={[estilos.total, saldo > 0 && estilos.totalPendiente]}>
              {saldo > 0 ? `−${formatearMoneda(saldo)}` : formatearMoneda(total)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} style={{ marginLeft: 4 }} />
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
                  size={14}
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
        ItemSeparatorComponent={() => <View style={{ height: ESPACIADO.sm }} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={estilos.vacioIconBox}>
              <Ionicons name="cube-outline" size={40} color={COLORES.textoDeshabilitado} />
            </View>
            <Text style={estilos.vacioTitulo}>
              {filtroActivo === 'todos' ? 'Sin pedidos' : `Sin ${filtroActivo}`}
            </Text>
            <Text style={estilos.vacioTexto}>
              {filtroActivo === 'pendientes'
                ? 'Todos los pedidos están pagados'
                : 'Creá tu primer pedido de compra o venta'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => navigation.navigate('CrearPedido', {})} />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tipoIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ESPACIADO.sm,
  },
  itemInfo: { flex: 1, gap: 5 },
  persona: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
  },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipoBadge: {
    borderRadius: RADIO.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tipoBadgeTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold },
  metaSep: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoDeshabilitado },
  fecha: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  total: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  totalPendiente: { color: COLORES.peligro },

  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACIADO.xl },
  vacioIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.md,
  },
  vacioTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: ESPACIADO.xs },
  vacioTexto: { fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default ListaPedidos;
