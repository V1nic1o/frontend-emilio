import React, { useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { PersonasStackParamList } from '../../navegacion/tipos';
import { usePersonaDetalle } from '../../hooks/usePersonas';
import { usePedidos } from '../../hooks/usePedidos';
import { Pedido } from '../../tipos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import EstadoBadge from '../../componentes/EstadoBadge';
import FAB from '../../componentes/FAB';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../utilidades/formato';

type Props = NativeStackScreenProps<PersonasStackParamList, 'DetallePersona'>;

const DetallePersona: React.FC<Props> = ({ navigation, route }) => {
  const { personaId } = route.params;
  const { persona, cargando: cargandoPersona, error, cargar: cargarPersona } = usePersonaDetalle(personaId);
  // Traemos todos los pedidos para tener el resumen financiero completo
  const { pedidos, cargando: cargandoPedidos, cargar: cargarPedidos } = usePedidos();

  const cargando = cargandoPersona || cargandoPedidos;

  const cargar = useCallback(() => {
    cargarPersona();
    cargarPedidos();
  }, [cargarPersona, cargarPedidos]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (persona) navigation.setOptions({ title: persona.nombre });
  }, [persona, navigation]);

  // Filtramos los pedidos de esta persona (con resumen completo)
  const pedidosPersona = pedidos.filter((p) => p.personaId === personaId);

  const renderPedido = useCallback(
    ({ item }: { item: Pedido }) => {
      const esVenta = item.tipo === 'venta';
      const resumen = item.resumen;
      const esCliente = persona?.tipo === 'cliente';
      const total = esCliente ? (resumen?.totalVenta ?? 0) : (resumen?.totalCompra ?? 0);
      const saldo = resumen ? Math.max(0, total - (resumen.totalPagado ?? 0)) : 0;

      return (
        <TouchableOpacity
          style={estilos.itemPedido}
          onPress={() => navigation.navigate('DetallePedido', { pedidoId: item.id })}
          activeOpacity={0.85}
        >
          <View style={[estilos.tipoIconBox, { backgroundColor: esVenta ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
            <Ionicons
              name={esVenta ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={22}
              color={esVenta ? COLORES.primario : COLORES.morado}
            />
          </View>
          <View style={estilos.pedidoInfo}>
            <View style={estilos.pedidoFila1}>
              <Text style={estilos.pedidoTipo}>{esVenta ? 'Venta' : 'Compra'}</Text>
              {resumen && <EstadoBadge estado={resumen.estado} />}
            </View>
            <Text style={estilos.pedidoFecha}>{formatearFecha(item.fecha)}</Text>
          </View>
          <View style={estilos.pedidoDer}>
            <Text style={estilos.pedidoTotal}>{formatearMoneda(total)}</Text>
            {saldo > 0 && (
              <Text style={estilos.pedidoSaldo}>Debe {formatearMoneda(saldo)}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      );
    },
    [navigation, persona]
  );

  if (cargando && !persona) return <CargandoSpinner />;
  if (error) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;
  if (!persona) return null;

  const esCliente = persona.tipo === 'cliente';

  // Totales calculados con datos reales
  const totalSaldo = pedidosPersona.reduce((acc, p) => {
    const total = esCliente ? (p.resumen?.totalVenta ?? 0) : (p.resumen?.totalCompra ?? 0);
    return acc + Math.max(0, total - (p.resumen?.totalPagado ?? 0));
  }, 0);

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <FlatList
        data={pedidosPersona}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPedido}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        ListHeaderComponent={
          <View>
            {/* Perfil */}
            <View style={estilos.perfilCard}>
              <View style={[estilos.avatar, { backgroundColor: esCliente ? COLORES.clienteClaro : COLORES.proveedorClaro }]}>
                <Text style={[estilos.avatarLetra, { color: esCliente ? COLORES.cliente : COLORES.proveedor }]}>
                  {persona.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={estilos.nombre}>{persona.nombre}</Text>
              <View style={[estilos.tipoPill, { backgroundColor: esCliente ? COLORES.clienteClaro : COLORES.proveedorClaro }]}>
                <Ionicons name={esCliente ? 'person' : 'business'} size={13} color={esCliente ? COLORES.cliente : COLORES.proveedor} />
                <Text style={[estilos.tipoPillTexto, { color: esCliente ? COLORES.cliente : COLORES.proveedor }]}>
                  {esCliente ? 'Cliente' : 'Proveedor'}
                </Text>
              </View>
            </View>

            {/* Resumen financiero */}
            {pedidosPersona.length > 0 && (
              <View style={estilos.resumenCard}>
                <View style={estilos.resumenFila}>
                  <View style={estilos.resumenItem}>
                    <Text style={estilos.resumenLabel}>
                      {esCliente ? 'Por cobrar' : 'Por pagar'}
                    </Text>
                    <Text style={[estilos.resumenValor, { color: totalSaldo > 0 ? COLORES.peligro : COLORES.exito }]}>
                      {formatearMoneda(totalSaldo)}
                    </Text>
                  </View>
                  <View style={estilos.resumenDivisor} />
                  <View style={estilos.resumenItem}>
                    <Text style={estilos.resumenLabel}>Pedidos</Text>
                    <Text style={estilos.resumenValor}>{pedidosPersona.length}</Text>
                  </View>
                </View>
              </View>
            )}

            {pedidosPersona.length > 0 && (
              <Text style={estilos.seccionTitulo}>Pedidos · {pedidosPersona.length}</Text>
            )}
          </View>
        }
        contentContainerStyle={[estilos.lista, { paddingBottom: 100 }]}
        ItemSeparatorComponent={() => <View style={{ height: ESPACIADO.sm }} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={estilos.vacioIconBox}>
              <Ionicons name="cube-outline" size={36} color={COLORES.textoDeshabilitado} />
            </View>
            <Text style={estilos.vacioTitulo}>Sin pedidos</Text>
            <Text style={estilos.vacioTexto}>Tocá + para crear uno</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => navigation.navigate('CrearPedido', { personaId: persona.id })} />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xl },
  perfilCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    alignItems: 'center',
    marginBottom: ESPACIADO.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.md,
  },
  avatarLetra: {
    fontSize: 28,
    fontWeight: FUENTE.pesoBold,
  },
  nombre: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.sm,
    letterSpacing: -0.3,
  },
  tipoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIO.full,
    paddingVertical: 5,
    paddingHorizontal: ESPACIADO.md,
  },
  tipoPillTexto: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold },
  resumenCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  resumenFila: { flexDirection: 'row', alignItems: 'center' },
  resumenItem: { flex: 1, alignItems: 'center', paddingVertical: ESPACIADO.xs },
  resumenLabel: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginBottom: 4 },
  resumenValor: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  resumenDivisor: { width: 1, height: 36, backgroundColor: COLORES.borde },
  seccionTitulo: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  tipoIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ESPACIADO.md,
  },
  pedidoInfo: { flex: 1, gap: 4 },
  pedidoFila1: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm },
  pedidoTipo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  pedidoFecha: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },
  pedidoDer: { alignItems: 'flex-end', gap: 3 },
  pedidoTotal: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  pedidoSaldo: { fontSize: FUENTE.tamanoXs, color: COLORES.peligro, fontWeight: FUENTE.pesoMedio },
  vacio: { alignItems: 'center', paddingVertical: ESPACIADO.xl },
  vacioIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.md,
  },
  vacioTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 4 },
  vacioTexto: { fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default DetallePersona;
