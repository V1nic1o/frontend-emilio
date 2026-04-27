import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CatalogoStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { useCarritoCatalogoPedido } from '../../contexto/CarritoCatalogoContext';
import { productosServicio } from '../../servicios/productos.servicio';
import { Producto } from '../../tipos';
import FAB from '../../componentes/FAB';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, parsearNumero } from '../../utilidades/formato';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'CatalogoProductos'>;

/** Texto del campo cantidad alineado con el valor numérico (enteros sin ".0"). */
function cantidadATexto(c: number): string {
  if (Number.isInteger(c)) return String(c);
  return String(c);
}

/** Campo para escribir cantidades grandes; al salir aplica el valor. */
const CantidadCarritoEditable: React.FC<{
  productoId: number;
  cantidad: number;
  onFijar: (productoId: number, valor: number) => void;
}> = React.memo(({ productoId, cantidad, onFijar }) => {
  const [texto, setTexto] = useState(() => cantidadATexto(cantidad));

  useEffect(() => {
    setTexto(cantidadATexto(cantidad));
  }, [cantidad]);

  const aplicar = () => {
    const n = parsearNumero(texto);
    if (n <= 0) {
      setTexto(cantidadATexto(cantidad));
      return;
    }
    onFijar(productoId, n);
    setTexto(cantidadATexto(n));
  };

  return (
    <TextInput
      style={estilos.carritoCantidadInput}
      value={texto}
      onChangeText={setTexto}
      onBlur={aplicar}
      onSubmitEditing={aplicar}
      keyboardType="decimal-pad"
      selectTextOnFocus
      returnKeyType="done"
      maxLength={12}
    />
  );
});

function normalizarBusqueda(s: string): string {
  return s.trim().toLowerCase();
}

const COLS_CATALOGO = 3;
const COL_GAP_GRID = ESPACIADO.xs;
const PADDING_GRID = ESPACIADO.sm;

const CatalogoProductos: React.FC<Props> = ({ navigation }) => {
  const { width: anchoVentana } = useWindowDimensions();
  const cardWidthGrid = useMemo(
    () => (anchoVentana - PADDING_GRID * 2 - COL_GAP_GRID * (COLS_CATALOGO - 1)) / COLS_CATALOGO,
    [anchoVentana],
  );

  const { walletSeleccionado } = useWallet();
  const {
    lineas,
    unidadesEnCarrito,
    agregarProducto,
    agregarSeleccion,
    ajustarCantidadPorProductoId,
    setCantidadAbsolutaPorProductoId,
    limpiarCarrito,
    marcarTransferenciaAlPedido,
  } = useCarritoCatalogoPedido();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modoArmarPedido, setModoArmarPedido] = useState(false);
  const [seleccionIds, setSeleccionIds] = useState<Set<number>>(new Set());

  const cargar = useCallback(async () => {
    if (!walletSeleccionado) return;
    setCargando(true);
    setError(null);
    try {
      const data = await productosServicio.listarPorWallet(walletSeleccionado.id);
      setProductos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const productosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const toggleSeleccion = useCallback((id: number) => {
    setSeleccionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const agregarSeleccionadosAlCarrito = useCallback(() => {
    const elegidos = productos.filter((p) => seleccionIds.has(p.id));
    if (elegidos.length === 0) return;
    agregarSeleccion(elegidos);
    setSeleccionIds(new Set());
  }, [productos, seleccionIds, agregarSeleccion]);

  const handleEliminar = useCallback((producto: Producto) => {
    Alert.alert(
      `Eliminar "${producto.nombre}"`,
      'Los pedidos que lo usen no se verán afectados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await productosServicio.eliminar(producto.id);
              setProductos((prev) => prev.filter((p) => p.id !== producto.id));
              setSeleccionIds((prev) => {
                const next = new Set(prev);
                next.delete(producto.id);
                return next;
              });
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ],
    );
  }, []);

  const filasProductos = useMemo(() => {
    const filas: (Producto | null)[][] = [];
    for (let i = 0; i < productosFiltrados.length; i += COLS_CATALOGO) {
      const fila: (Producto | null)[] = [];
      for (let c = 0; c < COLS_CATALOGO; c++) {
        fila.push(productosFiltrados[i + c] ?? null);
      }
      filas.push(fila);
    }
    return filas;
  }, [productosFiltrados]);

  const renderFilaProducto = useCallback(
    ({ item: fila }: { item: (Producto | null)[] }) => (
      <View style={estilos.filaGrid}>
        {fila.map((item, idx) => {
          if (!item) return <View key={`empty-${idx}`} style={{ width: cardWidthGrid }} />;

          const esBien = item.tipo === 'bien';
          const color = esBien ? COLORES.primario : COLORES.morado;
          const fondo = esBien ? COLORES.primarioClaro : COLORES.moradoClaro;
          const inicial = item.nombre.charAt(0).toUpperCase();
          const seleccionado = seleccionIds.has(item.id);

          return (
            <View
              key={item.id}
              style={[
                estilos.tarjetaCat,
                { width: cardWidthGrid },
                modoArmarPedido && estilos.tarjetaCatModoPedido,
                modoArmarPedido && seleccionado && estilos.tarjetaCatSeleccionada,
              ]}
            >
              {modoArmarPedido && seleccionado && (
                <View style={estilos.tarjetaCatSelloOk} pointerEvents="none">
                  <Ionicons name="checkmark-circle" size={22} color={COLORES.primario} />
                </View>
              )}
              {modoArmarPedido ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => toggleSeleccion(item.id)}
                  style={estilos.tarjetaCatTappable}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: seleccionado }}
                  accessibilityLabel={
                    seleccionado ? `${item.nombre}, seleccionado. Tocá para quitar.` : `${item.nombre}. Tocá la tarjeta para seleccionar.`
                  }
                >
                  <View style={[estilos.tarjetaCatTop, { backgroundColor: fondo }]}>
                    <View style={[estilos.tarjetaCatAvatar, { backgroundColor: color }]}>
                      <Text style={estilos.tarjetaCatAvatarLetra}>{inicial}</Text>
                    </View>
                    <View style={[estilos.tarjetaCatPill, { backgroundColor: color }]}>
                      <Ionicons name={esBien ? 'cube' : 'construct'} size={8} color={COLORES.blanco} />
                      <Text style={estilos.tarjetaCatPillTxt}>{esBien ? 'Prod.' : 'Serv.'}</Text>
                    </View>
                  </View>
                  <View style={estilos.tarjetaCatBody}>
                    <Text style={estilos.tarjetaCatNombre} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                    <View style={estilos.tarjetaCatPrecioFila}>
                      <Text style={estilos.tarjetaCatPrecioEtq}>Costo</Text>
                      <Text style={estilos.tarjetaCatPrecioVal}>{formatearMoneda(item.precioProveedor)}</Text>
                    </View>
                    <View style={estilos.tarjetaCatPrecioFila}>
                      <Text style={estilos.tarjetaCatPrecioEtq}>Venta</Text>
                      <Text style={estilos.tarjetaCatPrecioVenta}>{formatearMoneda(item.precioEmpresa)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('FormProducto', { productoId: item.id })}
                  style={estilos.tarjetaCatTappable}
                >
                  <View style={[estilos.tarjetaCatTop, { backgroundColor: fondo }]}>
                    <View style={[estilos.tarjetaCatAvatar, { backgroundColor: color }]}>
                      <Text style={estilos.tarjetaCatAvatarLetra}>{inicial}</Text>
                    </View>
                    <View style={[estilos.tarjetaCatPill, { backgroundColor: color }]}>
                      <Ionicons name={esBien ? 'cube' : 'construct'} size={8} color={COLORES.blanco} />
                      <Text style={estilos.tarjetaCatPillTxt}>{esBien ? 'Prod.' : 'Serv.'}</Text>
                    </View>
                  </View>
                  <View style={estilos.tarjetaCatBody}>
                    <Text style={estilos.tarjetaCatNombre} numberOfLines={2}>
                      {item.nombre}
                    </Text>
                    <View style={estilos.tarjetaCatPrecioFila}>
                      <Text style={estilos.tarjetaCatPrecioEtq}>Costo</Text>
                      <Text style={estilos.tarjetaCatPrecioVal}>{formatearMoneda(item.precioProveedor)}</Text>
                    </View>
                    <View style={estilos.tarjetaCatPrecioFila}>
                      <Text style={estilos.tarjetaCatPrecioEtq}>Venta</Text>
                      <Text style={estilos.tarjetaCatPrecioVenta}>{formatearMoneda(item.precioEmpresa)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              <View style={estilos.tarjetaCatAcciones}>
                {modoArmarPedido && (
                  <TouchableOpacity
                    style={[estilos.tarjetaCatAccion, estilos.tarjetaCatAccionCarrito]}
                    onPress={() => agregarProducto(item, 1)}
                    activeOpacity={0.85}
                    accessibilityLabel="Sumar una unidad al carrito"
                  >
                    <Ionicons name="add" size={20} color={COLORES.blanco} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={estilos.tarjetaCatAccion}
                  onPress={() => navigation.navigate('FormProducto', { productoId: item.id })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORES.primario} />
                </TouchableOpacity>
                {!modoArmarPedido && (
                  <TouchableOpacity
                    style={[estilos.tarjetaCatAccion, { backgroundColor: COLORES.peligroClaro }]}
                    onPress={() => handleEliminar(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORES.peligro} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    ),
    [
      modoArmarPedido,
      navigation,
      seleccionIds,
      toggleSeleccion,
      agregarProducto,
      handleEliminar,
      cardWidthGrid,
    ],
  );

  const irAPedidoConCarrito = useCallback(() => {
    if (lineas.length === 0) {
      Alert.alert('Carrito vacío', 'Agregá productos o servicios al carrito antes de continuar.');
      return;
    }
    marcarTransferenciaAlPedido();
    // Catálogo vive en el tab: el padre del stack es el Tab navigator.
    navigation.dispatch(
      CommonActions.navigate({
        name: 'PedidosTab',
        params: {
          screen: 'CrearPedido',
          params: {},
        },
      }),
    );
  }, [lineas.length, marcarTransferenciaAlPedido, navigation]);

  const confirmarVaciarCarrito = () => {
    Alert.alert('Vaciar carrito', '¿Quitar todos los productos del carrito?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: limpiarCarrito },
    ]);
  };

  if (cargando && productos.length === 0) return <CargandoSpinner />;
  if (error) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  const mostrarBarraCarrito = unidadesEnCarrito > 0;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <View style={estilos.topBarCatalogo}>
        <View style={estilos.busquedaWrap}>
          <Ionicons name="search-outline" size={18} color={COLORES.textoDeshabilitado} style={estilos.busquedaIcono} />
          <TextInput
            style={estilos.busquedaInput}
            placeholder="Buscar por nombre…"
            placeholderTextColor={COLORES.textoDeshabilitado}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <TouchableOpacity
          style={[estilos.togglePedido, modoArmarPedido && estilos.togglePedidoActivo]}
          onPress={() => {
            setModoArmarPedido((v) => !v);
            setSeleccionIds(new Set());
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="cart-outline" size={18} color={modoArmarPedido ? COLORES.primario : COLORES.textoSecundario} />
          <Text style={[estilos.togglePedidoTexto, modoArmarPedido && estilos.togglePedidoTextoActivo]}>
            Armar pedido
          </Text>
        </TouchableOpacity>

        {modoArmarPedido && (
          <View style={estilos.filaModoPedido}>
            <TouchableOpacity
              style={[estilos.btnSecundario, seleccionIds.size === 0 && estilos.btnSecundarioDisabled]}
              onPress={agregarSeleccionadosAlCarrito}
              disabled={seleccionIds.size === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color={seleccionIds.size === 0 ? COLORES.textoDeshabilitado : COLORES.primario} />
              <Text style={[estilos.btnSecundarioTxt, seleccionIds.size === 0 && estilos.btnSecundarioTxtDisabled]}>
                Agregar seleccionados ({seleccionIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mostrarBarraCarrito && (
          <View style={estilos.resumenCarrito}>
            <View style={estilos.resumenCarritoCabecera}>
              <Text style={estilos.resumenCarritoTitulo}>Carrito</Text>
              <TouchableOpacity onPress={confirmarVaciarCarrito} style={estilos.btnVaciar} hitSlop={8}>
                <Text style={estilos.btnVaciarTxt}>Vaciar</Text>
              </TouchableOpacity>
            </View>
            <Text style={estilos.resumenCarritoSub}>
              {lineas.length} {lineas.length === 1 ? 'línea' : 'líneas'} · {unidadesEnCarrito}{' '}
              {unidadesEnCarrito === 1 ? 'unidad' : 'unidades'}
              {' · '}
              <Text style={estilos.resumenCarritoHint}>tocá el número para escribir cantidad</Text>
            </Text>
            <ScrollView style={estilos.carritoLineasScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {lineas.map((l) => (
                <View key={l.productoId} style={estilos.carritoLinea}>
                  <Text style={estilos.carritoLineaNombre} numberOfLines={1}>
                    {l.nombre}
                  </Text>
                  <View style={estilos.carritoStepper}>
                    <TouchableOpacity
                      style={estilos.carritoStepBtn}
                      onPress={() => ajustarCantidadPorProductoId(l.productoId, -1)}
                      hitSlop={6}
                      accessibilityLabel="Menos una unidad"
                    >
                      <Ionicons name="remove" size={18} color={COLORES.primario} />
                    </TouchableOpacity>
                    <CantidadCarritoEditable
                      productoId={l.productoId}
                      cantidad={l.cantidad}
                      onFijar={setCantidadAbsolutaPorProductoId}
                    />
                    <TouchableOpacity
                      style={estilos.carritoStepBtn}
                      onPress={() => ajustarCantidadPorProductoId(l.productoId, 1)}
                      hitSlop={6}
                      accessibilityLabel="Más una unidad"
                    >
                      <Ionicons name="add" size={18} color={COLORES.primario} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <FlatList
        data={productosFiltrados.length === 0 ? [] : filasProductos}
        keyExtractor={(_, i) => `fila-${i}`}
        renderItem={renderFilaProducto}
        contentContainerStyle={[
          estilos.listaGrid,
          productosFiltrados.length === 0 && estilos.listaGridVacia,
          mostrarBarraCarrito && estilos.listaConBarraInferior,
          modoArmarPedido && estilos.listaConBarraInferior,
        ]}
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: COL_GAP_GRID }} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={estilos.vacioBadge}>
              <Ionicons name="grid-outline" size={32} color={COLORES.textoDeshabilitado} />
            </View>
            <Text style={estilos.vacioTitulo}>{busqueda.trim() ? 'Sin coincidencias' : 'Sin productos'}</Text>
            <Text style={estilos.vacioDesc}>
              {busqueda.trim()
                ? 'Probá con otro nombre en el buscador'
                : 'Agregá productos al catálogo para agilizar la creación de pedidos'}
            </Text>
          </View>
        }
        extraData={anchoVentana}
      />

      {mostrarBarraCarrito && (
        <View style={estilos.barraInferior}>
          <TouchableOpacity style={estilos.btnContinuar} onPress={irAPedidoConCarrito} activeOpacity={0.88}>
            <Ionicons name="arrow-forward-circle" size={22} color={COLORES.blanco} />
            <Text style={estilos.btnContinuarTxt}>Cliente / proveedor e importes</Text>
          </TouchableOpacity>
          <Text style={estilos.barraAyuda}>Se abre el mismo formulario de pedido (pago inicial e impuesto opcionales).</Text>
        </View>
      )}

      {!modoArmarPedido && (
        <FAB
          icono="add"
          onPress={() => navigation.navigate('FormProducto', {})}
          estilo={mostrarBarraCarrito ? { bottom: 108 } : undefined}
        />
      )}
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  topBarCatalogo: {
    paddingTop: ESPACIADO.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
    paddingHorizontal: ESPACIADO.md,
    paddingBottom: ESPACIADO.sm,
    gap: ESPACIADO.xs,
  },
  busquedaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
    paddingHorizontal: ESPACIADO.sm,
    marginBottom: ESPACIADO.sm,
  },
  busquedaIcono: { marginRight: 4 },
  busquedaInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: FUENTE.tamanoBase,
    color: COLORES.texto,
  },
  togglePedido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
  },
  togglePedidoActivo: {
    borderColor: COLORES.primario,
    backgroundColor: COLORES.primarioClaro,
  },
  togglePedidoTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
  },
  togglePedidoTextoActivo: { color: COLORES.primario },
  filaModoPedido: { marginTop: ESPACIADO.sm },
  btnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  btnSecundarioDisabled: { opacity: 0.55 },
  btnSecundarioTxt: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold, color: COLORES.primario },
  btnSecundarioTxtDisabled: { color: COLORES.textoDeshabilitado },
  resumenCarrito: {
    marginTop: ESPACIADO.sm,
    padding: ESPACIADO.sm,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.md,
  },
  resumenCarritoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumenCarritoTitulo: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  resumenCarritoSub: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 4,
    marginBottom: ESPACIADO.xs,
  },
  resumenCarritoHint: { fontStyle: 'italic' },
  carritoLineasScroll: { maxHeight: 132 },
  carritoLinea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    gap: ESPACIADO.sm,
  },
  carritoLineaNombre: {
    flex: 1,
    minWidth: 0,
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.texto,
    fontWeight: FUENTE.pesoSemibold,
  },
  carritoStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  carritoStepBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  carritoCantidadInput: {
    minWidth: 56,
    maxWidth: 88,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    textAlign: 'center',
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  btnVaciar: { paddingHorizontal: ESPACIADO.sm, paddingVertical: 4 },
  btnVaciarTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.peligro, fontWeight: FUENTE.pesoSemibold },

  listaGrid: { padding: PADDING_GRID, paddingBottom: 100 },
  listaGridVacia: { flex: 1 },
  listaConBarraInferior: { paddingBottom: 200 },

  filaGrid: {
    flexDirection: 'row',
    gap: COL_GAP_GRID,
  },
  tarjetaCat: {
    position: 'relative',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tarjetaCatModoPedido: {
    borderColor: COLORES.borde,
  },
  tarjetaCatSeleccionada: {
    borderColor: COLORES.primario,
    shadowColor: COLORES.primario,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tarjetaCatSelloOk: {
    position: 'absolute',
    right: 2,
    top: 2,
    zIndex: 5,
    backgroundColor: COLORES.tarjeta,
    borderRadius: 14,
  },
  tarjetaCatTappable: { flex: 1 },
  tarjetaCatTop: {
    paddingTop: ESPACIADO.xs,
    paddingBottom: ESPACIADO.xs,
    alignItems: 'center',
    gap: 4,
  },
  tarjetaCatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tarjetaCatAvatarLetra: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
  },
  tarjetaCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: RADIO.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tarjetaCatPillTxt: {
    fontSize: 8,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
    letterSpacing: 0.2,
  },
  tarjetaCatBody: {
    paddingHorizontal: ESPACIADO.xs,
    paddingBottom: ESPACIADO.xs,
    gap: 2,
  },
  tarjetaCatNombre: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    lineHeight: 14,
  },
  tarjetaCatPrecioFila: { gap: 0 },
  tarjetaCatPrecioEtq: {
    fontSize: 8,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoSemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  tarjetaCatPrecioVal: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  tarjetaCatPrecioVenta: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.pagado,
  },
  tarjetaCatAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: ESPACIADO.xs,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  tarjetaCatAccion: {
    width: 40,
    height: 40,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaCatAccionCarrito: { backgroundColor: COLORES.primario },

  barraInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.lg,
    backgroundColor: COLORES.tarjeta,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  btnContinuar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primario,
    paddingVertical: ESPACIADO.md,
    borderRadius: RADIO.lg,
  },
  btnContinuarTxt: {
    flexShrink: 1,
    textAlign: 'center',
    color: COLORES.blanco,
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
  },
  barraAyuda: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    marginTop: ESPACIADO.sm,
    lineHeight: 16,
  },

  vacio: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: ESPACIADO.xl,
    gap: ESPACIADO.sm,
  },
  vacioBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.sm,
  },
  vacioTitulo: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  vacioDesc: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CatalogoProductos;
