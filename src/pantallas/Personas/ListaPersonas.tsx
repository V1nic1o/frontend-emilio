import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PersonasStackParamList } from '../../navegacion/tipos';
import { usePersonas } from '../../hooks/usePersonas';
import { usePedidos } from '../../hooks/usePedidos';
import { useAsesoriasPendientes } from '../../hooks/useAsesorias';
import { Persona } from '../../tipos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import FAB from '../../componentes/FAB';
import { CapaBlobsAtmosfera, estilosFondoAtmosfera } from '../../componentes/FondoAtmosfera';
import { useWallet } from '../../contexto/WalletContext';
import { esWalletPersonal } from '../../utilidades/wallet';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda } from '../../utilidades/formato';

type Props = NativeStackScreenProps<PersonasStackParamList, 'ListaPersonas'>;
type Filtro = 'todos' | 'cliente' | 'proveedor';

const FILTROS: { id: Filtro; etiqueta: string; icono: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'todos', etiqueta: 'Todos', icono: 'people-outline' },
  { id: 'cliente', etiqueta: 'Clientes', icono: 'person-outline' },
  { id: 'proveedor', etiqueta: 'Proveedores', icono: 'business-outline' },
];

const COL_GAP = ESPACIADO.sm;
const PADDING = ESPACIADO.md;

const ListaPersonas: React.FC<Props> = ({ navigation }) => {
  const { walletSeleccionado } = useWallet();
  const { width } = useWindowDimensions();
  const cardWidth = useMemo(() => (width - PADDING * 2 - COL_GAP) / 2, [width]);
  const { personas, cargando: cargandoPersonas, error, cargar: cargarPersonas } = usePersonas();
  const { pedidos, cargando: cargandoPedidos, cargar: cargarPedidos } = usePedidos();
  const { pendientes: asesoriasPendientes, cargar: cargarAsesoriasPendientes, cargando: cargandoAsesoriasPend } =
    useAsesoriasPendientes();
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('todos');

  const pendienteAsesoriaPorPersona = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of asesoriasPendientes) {
      m.set(a.personaId, (m.get(a.personaId) ?? 0) + a.montoTotal);
    }
    return m;
  }, [asesoriasPendientes]);

  const cargar = useCallback(async () => {
    await Promise.all([cargarPersonas(), cargarPedidos(), cargarAsesoriasPendientes()]);
  }, [cargarPersonas, cargarPedidos, cargarAsesoriasPendientes]);

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

  const personasFiltradas = useMemo(() => {
    if (filtroActivo === 'todos') return personas;
    return personas.filter((p) => p.tipo === filtroActivo);
  }, [personas, filtroActivo]);

  const conteos = useMemo(() => ({
    todos: personas.length,
    cliente: personas.filter((p) => p.tipo === 'cliente').length,
    proveedor: personas.filter((p) => p.tipo === 'proveedor').length,
  }), [personas]);

  const filas = useMemo(() => {
    const out: (Persona | null)[][] = [];
    for (let i = 0; i < personasFiltradas.length; i += 2) {
      out.push([personasFiltradas[i], personasFiltradas[i + 1] ?? null]);
    }
    return out;
  }, [personasFiltradas]);

  const renderFila = useCallback(
    ({ item: fila }: { item: (Persona | null)[] }) => (
      <View style={estilos.fila}>
        {fila.map((item, idx) => {
          if (!item) return <View key={`empty-${idx}`} style={{ width: cardWidth }} />;

          const esCliente = item.tipo === 'cliente';
          const saldoPropio = getSaldo(item.id, item.tipo);
          const saldoCostoProveedor = item.saldoCostoPendienteConProveedor ?? 0;
          const saldoVentasCobrarProveedor = item.saldoVentaPorCobrarComoProveedor ?? 0;
          const saldoPorCobrarClienteProveedor = item.saldoPorCobrarClienteAProveedor ?? 0;
          const saldoAsesoria = esCliente ? pendienteAsesoriaPorPersona.get(item.id) ?? 0 : 0;
          const porPagarProveedorTotal = esCliente ? saldoPropio : saldoPropio + saldoCostoProveedor;
          const tienePendienteCliente = esCliente && saldoPropio + saldoAsesoria > 0;
          const tienePendienteProveedor =
            !esCliente &&
            (porPagarProveedorTotal > 0 || saldoVentasCobrarProveedor > 0 || saldoPorCobrarClienteProveedor > 0);
          const color = esCliente ? COLORES.cliente : COLORES.proveedor;
          const fondo = esCliente ? COLORES.clienteClaro : COLORES.proveedorClaro;
          const inicial = (item.nombre?.trim() || '?').charAt(0).toUpperCase();

          return (
            <TouchableOpacity
              key={item.id}
              style={[estilos.card, { width: cardWidth }]}
              onPress={() => navigation.navigate('DetallePersona', { personaId: item.id })}
              activeOpacity={0.85}
            >
              {/* Zona superior con color */}
              <View style={[estilos.cardTop, { backgroundColor: fondo }]}>
                <View style={[estilos.avatarCircle, { backgroundColor: color }]}>
                  <Text style={estilos.avatarLetra}>{inicial}</Text>
                </View>
                <View style={[estilos.tipoPill, { backgroundColor: color }]}>
                  <Ionicons name={esCliente ? 'person' : 'business'} size={9} color="#fff" />
                  <Text style={estilos.tipoPillTexto}>{esCliente ? 'Cliente' : 'Proveedor'}</Text>
                </View>
              </View>

              {/* Zona inferior con info */}
              <View style={estilos.cardBody}>
                <Text style={estilos.nombre} numberOfLines={2}>{item.nombre}</Text>

                {esCliente ? (
                  tienePendienteCliente ? (
                    <View style={estilos.saldoBox}>
                      <Text style={estilos.saldoLabel}>Por cobrar</Text>
                      <Text style={[estilos.saldoMonto, { color: COLORES.peligro }]}>
                        {formatearMoneda(saldoPropio + saldoAsesoria)}
                      </Text>
                    </View>
                  ) : (
                    <View style={estilos.alDiaBox}>
                      <Ionicons name="checkmark-circle" size={12} color={COLORES.exito} />
                      <Text style={estilos.alDiaTexto}>Al día</Text>
                    </View>
                  )
                ) : tienePendienteProveedor ? (
                  <View style={{ gap: ESPACIADO.xs }}>
                    {saldoVentasCobrarProveedor > 0 && (
                      <View style={estilos.saldoBox}>
                        <Text style={[estilos.saldoLabel, estilos.saldoLabelNatural]}>Pendiente sin cliente</Text>
                        <Text style={[estilos.saldoMonto, { color: COLORES.primario }]}>
                          {formatearMoneda(saldoVentasCobrarProveedor)}
                        </Text>
                      </View>
                    )}
                    {saldoPorCobrarClienteProveedor > 0 && (
                      <View style={estilos.saldoBox}>
                        <View style={estilos.saldoEtiquetaFila}>
                          <Text style={[estilos.saldoLabel, estilos.saldoLabelNatural]}>Por cobrar</Text>
                          <Text style={estilos.saldoMicroCliente}>al cliente</Text>
                        </View>
                        <Text style={[estilos.saldoMonto, { color: COLORES.peligro }]}>
                          {formatearMoneda(saldoPorCobrarClienteProveedor)}
                        </Text>
                      </View>
                    )}
                    {porPagarProveedorTotal > 0 && (
                      <View style={estilos.saldoBox}>
                        <Text style={[estilos.saldoLabel, estilos.saldoLabelNatural]}>Por pagar</Text>
                        <Text style={[estilos.saldoMonto, { color: COLORES.advertencia }]}>
                          {formatearMoneda(porPagarProveedorTotal)}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={estilos.alDiaBox}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORES.exito} />
                    <Text style={estilos.alDiaTexto}>Al día</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [navigation, getSaldo, cardWidth, pendienteAsesoriaPorPersona]
  );

  if (cargandoPersonas && personas.length === 0) return <CargandoSpinner />;
  if (error && personas.length === 0 && !cargandoPersonas) {
    return <ErrorMensaje mensaje={error} onReintentar={cargar} />;
  }

  return (
    <SafeAreaView style={[estilosComunes.contenedor, estilosFondoAtmosfera.safeArea]} edges={['bottom']}>
      <CapaBlobsAtmosfera esPersonal={esWalletPersonal(walletSeleccionado)} />
      <View style={estilosFondoAtmosfera.contenidoDelante}>
        {/* Descripción + filtros */}
        <View style={estilos.topBar}>
          <Text style={estilos.descTexto}>
            Gestioná tus clientes y proveedores. Mirá sus saldos y pedidos desde aquí.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.filtrosScroll}
          >
            {FILTROS.map((f) => {
              const activo = filtroActivo === f.id;
              const colorActivo = f.id === 'cliente' ? COLORES.cliente : f.id === 'proveedor' ? COLORES.proveedor : COLORES.primario;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[estilos.filtroBtn, activo && { backgroundColor: colorActivo }]}
                  onPress={() => setFiltroActivo(f.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={f.icono} size={13} color={activo ? '#fff' : COLORES.textoSecundario} />
                  <Text style={[estilos.filtroTexto, activo && { color: '#fff' }]}>{f.etiqueta}</Text>
                  {conteos[f.id] > 0 && (
                    <View style={[estilos.filtroBadge, activo && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <Text style={[estilos.filtroBadgeTexto, activo && { color: '#fff' }]}>{conteos[f.id]}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={personasFiltradas.length === 0 ? [] : filas}
          keyExtractor={(_, i) => String(i)}
          extraData={{ width, ap: asesoriasPendientes.length }}
          renderItem={renderFila}
          contentContainerStyle={[estilos.lista, personasFiltradas.length === 0 && estilos.listaVacia]}
          refreshControl={
            <RefreshControl
              refreshing={cargandoPersonas || cargandoPedidos || cargandoAsesoriasPend}
              onRefresh={cargar}
              tintColor={COLORES.primario}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: COL_GAP }} />}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <View style={estilos.vacioIconBox}>
                <Ionicons name="people-outline" size={44} color={COLORES.textoDeshabilitado} />
              </View>
              <Text style={estilos.vacioTitulo}>
                {filtroActivo === 'todos' ? 'Sin personas aún' : filtroActivo === 'cliente' ? 'Sin clientes' : 'Sin proveedores'}
              </Text>
              <Text style={estilos.vacioTexto}>
                {filtroActivo === 'todos'
                  ? 'Tocá + para agregar tu primer cliente o proveedor'
                  : `No tenés ${filtroActivo === 'cliente' ? 'clientes' : 'proveedores'} registrados aún`}
              </Text>
            </View>
          }
        />
        <FAB onPress={() => navigation.navigate('CrearPersona')} />
      </View>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  lista: { padding: PADDING, paddingBottom: 100 },
  listaVacia: { flex: 1 },

  // Top bar: descripción + filtros
  topBar: {
    paddingTop: ESPACIADO.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
    gap: ESPACIADO.xs,
  },
  descTexto: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoDeshabilitado,
    lineHeight: 17,
    paddingHorizontal: ESPACIADO.md,
    paddingBottom: 2,
  },
  filtrosScroll: {
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.xs,
    paddingBottom: ESPACIADO.sm,
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
  filtroTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
  },
  filtroBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filtroBadgeTexto: {
    fontSize: 10,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
  },

  fila: {
    flexDirection: 'row',
    gap: COL_GAP,
  },

  card: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTop: {
    paddingTop: ESPACIADO.md,
    paddingBottom: ESPACIADO.sm,
    alignItems: 'center',
    gap: ESPACIADO.sm,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLetra: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: '#fff',
  },
  tipoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: RADIO.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tipoPillTexto: {
    fontSize: 9,
    fontWeight: FUENTE.pesoBold,
    color: '#fff',
    letterSpacing: 0.3,
  },

  cardBody: {
    padding: ESPACIADO.sm,
    paddingTop: ESPACIADO.sm,
    gap: ESPACIADO.xs,
  },
  nombre: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    lineHeight: 18,
  },
  saldoBox: { gap: 1 },
  saldoEtiquetaFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 4,
  },
  saldoLabel: {
    fontSize: 9,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoSemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  /** Etiquetas de saldo en tarjeta de proveedor: sin mayúsculas forzadas, más fácil de leer. */
  saldoLabelNatural: {
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: FUENTE.tamanoXs,
  },
  saldoMicroCliente: {
    fontSize: 10,
    lineHeight: 14,
    color: COLORES.textoDeshabilitado,
    fontWeight: FUENTE.pesoNormal,
  },
  saldoMonto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
  },
  alDiaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  alDiaTexto: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.exito,
  },

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

export default ListaPersonas;
