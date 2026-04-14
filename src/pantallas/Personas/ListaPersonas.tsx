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
import { usePersonas } from '../../hooks/usePersonas';
import { usePedidos } from '../../hooks/usePedidos';
import { Persona } from '../../tipos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import FAB from '../../componentes/FAB';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda } from '../../utilidades/formato';

type Props = NativeStackScreenProps<PersonasStackParamList, 'ListaPersonas'>;

const ListaPersonas: React.FC<Props> = ({ navigation }) => {
  const { personas, cargando: cargandoPersonas, error, cargar: cargarPersonas } = usePersonas();
  const { pedidos, cargar: cargarPedidos } = usePedidos();

  const cargar = useCallback(() => {
    cargarPersonas();
    cargarPedidos();
  }, [cargarPersonas, cargarPedidos]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargar);
    return unsubscribe;
  }, [navigation, cargar]);

  const getSaldo = useCallback((personaId: number, tipo: Persona['tipo']): number =>
    pedidos
      .filter((p) => p.personaId === personaId)
      .reduce((acc, p) => {
        const total = tipo === 'cliente' ? (p.resumen?.totalVenta ?? 0) : (p.resumen?.totalCompra ?? 0);
        return acc + Math.max(0, total - (p.resumen?.totalPagado ?? 0));
      }, 0),
    [pedidos]
  );

  const renderPersona = useCallback(
    ({ item }: { item: Persona }) => {
      const esCliente = item.tipo === 'cliente';
      const saldo = getSaldo(item.id, item.tipo);
      const color = esCliente ? COLORES.cliente : COLORES.proveedor;
      const fondo = esCliente ? COLORES.clienteClaro : COLORES.proveedorClaro;

      return (
        <TouchableOpacity
          style={estilos.item}
          onPress={() => navigation.navigate('DetallePersona', { personaId: item.id })}
          activeOpacity={0.82}
        >
          <View style={[estilos.avatar, { backgroundColor: fondo }]}>
            <Text style={[estilos.avatarLetra, { color }]}>
              {item.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={estilos.info}>
            <Text style={estilos.nombre} numberOfLines={1}>{item.nombre}</Text>
            <View style={[estilos.tipoPill, { backgroundColor: fondo }]}>
              <Ionicons name={esCliente ? 'person' : 'business'} size={10} color={color} />
              <Text style={[estilos.tipoTexto, { color }]}>
                {esCliente ? 'Cliente' : 'Proveedor'}
              </Text>
            </View>
          </View>
          {saldo > 0 ? (
            <View style={estilos.saldoBox}>
              <Text style={estilos.saldoLabel}>{esCliente ? 'cobrar' : 'pagar'}</Text>
              <Text style={estilos.saldoMonto}>{formatearMoneda(saldo)}</Text>
            </View>
          ) : (
            <Ionicons name="checkmark-circle" size={20} color={COLORES.pagado} />
          )}
          <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      );
    },
    [navigation, getSaldo]
  );

  if (cargandoPersonas && personas.length === 0) return <CargandoSpinner />;
  if (error && personas.length === 0) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <FlatList
        data={personas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPersona}
        contentContainerStyle={[estilos.lista, personas.length === 0 && estilos.listaVacia]}
        refreshControl={<RefreshControl refreshing={cargandoPersonas} onRefresh={cargar} tintColor={COLORES.primario} />}
        ItemSeparatorComponent={() => <View style={{ height: ESPACIADO.sm }} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={estilos.vacioIconBox}>
              <Ionicons name="people-outline" size={40} color={COLORES.textoDeshabilitado} />
            </View>
            <Text style={estilos.vacioTitulo}>Sin personas</Text>
            <Text style={estilos.vacioTexto}>Tocá + para agregar</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => navigation.navigate('CrearPersona')} />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
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
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ESPACIADO.md,
  },
  avatarLetra: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold },
  info: { flex: 1, gap: 5 },
  nombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  tipoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: RADIO.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
    alignSelf: 'flex-start',
  },
  tipoTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold },
  saldoBox: { alignItems: 'flex-end', marginRight: 4 },
  saldoLabel: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginBottom: 1 },
  saldoMonto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.pendiente },
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
  vacioTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 4 },
  vacioTexto: { fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario },
});

export default ListaPersonas;
