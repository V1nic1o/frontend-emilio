import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions, useFocusEffect, RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CatalogoStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { useCarritoCatalogoPedido } from '../../contexto/CarritoCatalogoContext';
import { productosServicio } from '../../servicios/productos.servicio';
import { perfilServicio } from '../../servicios/perfil.servicio';
import { generarYCompartirPdfCatalogo } from '../../utilidades/pdf';
import { Producto } from '../../tipos';
import FAB from '../../componentes/FAB';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, parsearNumero } from '../../utilidades/formato';
import { mostrarAlerta, confirmarYEntonces } from '../../utilidades/alertaPlataforma';

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
  const route = useRoute<RouteProp<CatalogoStackParamList, 'CatalogoProductos'>>();
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
  const [modoSeleccionPdf, setModoSeleccionPdf] = useState(false);
  const [seleccionPdfIds, setSeleccionPdfIds] = useState<Set<number>>(new Set());
  const [generandoPdf, setGenerandoPdf] = useState(false);

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

  useEffect(() => {
    if (route.params?.limpiarSeleccion) {
      setSeleccionIds(new Set());
      setModoArmarPedido(false);
      setSeleccionPdfIds(new Set());
      setModoSeleccionPdf(false);
      navigation.setParams({ limpiarSeleccion: undefined });
    }
  }, [route.params?.limpiarSeleccion, navigation]);

  const salirModoSeleccionPdf = useCallback(() => {
    setModoSeleccionPdf(false);
    setSeleccionPdfIds(new Set());
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const generarPdfCatalogo = useCallback(
    async (lista: Producto[]) => {
      if (!walletSeleccionado) return;
      setGenerandoPdf(true);
      try {
        const perfil = await perfilServicio.obtener(walletSeleccionado.id);
        await generarYCompartirPdfCatalogo(lista, perfil);
      } catch (e: unknown) {
        mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo generar el catálogo');
      } finally {
        setGenerandoPdf(false);
      }
    },
    [walletSeleccionado],
  );

  const compartirCatalogoPdf = useCallback(async () => {
    const lista = productosFiltrados.filter((p) => p.tipo === 'bien');
    if (lista.length === 0) {
      mostrarAlerta(
        'Sin productos',
        busqueda.trim()
          ? 'No hay productos (solo bienes) que coincidan con la búsqueda. Los servicios no se incluyen en el PDF.'
          : 'Agregá productos al catálogo antes de compartir. Los servicios no se incluyen en el PDF.',
      );
      return;
    }
    await generarPdfCatalogo(lista);
  }, [productosFiltrados, busqueda, generarPdfCatalogo]);

  const compartirCatalogoPdfSeleccion = useCallback(async () => {
    const lista = productosFiltrados.filter((p) => seleccionPdfIds.has(p.id) && p.tipo === 'bien');
    if (lista.length === 0) {
      mostrarAlerta(
        'Sin productos',
        seleccionPdfIds.size === 0
          ? 'Marcá al menos un producto tocando su tarjeta.'
          : 'Los servicios no se incluyen en el PDF. Seleccioná solo productos (no servicios).',
      );
      return;
    }
    await generarPdfCatalogo(lista);
    salirModoSeleccionPdf();
  }, [productosFiltrados, seleccionPdfIds, generarPdfCatalogo, salirModoSeleccionPdf]);

  const toggleSeleccionPdf = useCallback((producto: Producto) => {
    if (producto.tipo !== 'bien') {
      mostrarAlerta('Servicio', 'Los servicios no se incluyen en el PDF. Elegí solo productos.');
      return;
    }
    setSeleccionPdfIds((prev) => {
      const next = new Set(prev);
      if (next.has(producto.id)) next.delete(producto.id);
      else next.add(producto.id);
      return next;
    });
  }, []);

  const toggleSeleccion = useCallback((id: number) => {
    setSeleccionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEliminar = useCallback((producto: Producto) => {
    confirmarYEntonces(
      `Eliminar "${producto.nombre}"`,
      'Los pedidos que lo usen no se verán afectados.',
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await productosServicio.eliminar(producto.id);
          setProductos((prev) => prev.filter((p) => p.id !== producto.id));
          setSeleccionIds((prev) => {
            const next = new Set(prev);
            next.delete(producto.id);
            return next;
          });
          setSeleccionPdfIds((prev) => {
            const next = new Set(prev);
            next.delete(producto.id);
            return next;
          });
        } catch {
          mostrarAlerta('Error', 'No se pudo eliminar el producto');
        }
      },
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
          const seleccionadoPedido = seleccionIds.has(item.id);
          const seleccionadoPdf = seleccionPdfIds.has(item.id);
          const seleccionado = modoArmarPedido ? seleccionadoPedido : seleccionadoPdf;
          const fotoUrl = item.imagenUrl?.trim();

          const visualSuperior = fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={estilos.tarjetaCatFoto} resizeMode="cover" />
          ) : (
            <>
              <View style={[estilos.tarjetaCatAvatar, { backgroundColor: color }]}>
                <Text style={estilos.tarjetaCatAvatarLetra}>{inicial}</Text>
              </View>
              <View style={[estilos.tarjetaCatPill, { backgroundColor: color }]}>
                <Ionicons name={esBien ? 'cube' : 'construct'} size={8} color={COLORES.blanco} />
                <Text style={estilos.tarjetaCatPillTxt}>{esBien ? 'Prod.' : 'Serv.'}</Text>
              </View>
            </>
          );

          return (
            <View
              key={item.id}
              style={[
                estilos.tarjetaCat,
                { width: cardWidthGrid },
                (modoArmarPedido || modoSeleccionPdf) && estilos.tarjetaCatModoPedido,
                (modoArmarPedido || modoSeleccionPdf) && seleccionado && estilos.tarjetaCatSeleccionada,
              ]}
            >
              {(modoArmarPedido || modoSeleccionPdf) && seleccionado && (
                <View style={estilos.tarjetaCatSelloOk} pointerEvents="none">
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={modoSeleccionPdf ? COLORES.exito : COLORES.primario}
                  />
                </View>
              )}
              {modoArmarPedido ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => toggleSeleccion(item.id)}
                  style={estilos.tarjetaCatTappable}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: seleccionadoPedido }}
                  accessibilityLabel={
                    seleccionadoPedido
                      ? `${item.nombre}, seleccionado. Tocá para quitar.`
                      : `${item.nombre}. Tocá la tarjeta para seleccionar.`
                  }
                >
                  <View style={[estilos.tarjetaCatTop, fotoUrl ? estilos.tarjetaCatTopConFoto : { backgroundColor: fondo }]}>
                    {visualSuperior}
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
              ) : modoSeleccionPdf ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => toggleSeleccionPdf(item)}
                  style={estilos.tarjetaCatTappable}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: seleccionadoPdf }}
                  accessibilityLabel={
                    seleccionadoPdf
                      ? `${item.nombre}, incluido en el PDF. Tocá para quitar.`
                      : `${item.nombre}. Tocá la tarjeta para incluir en el PDF.`
                  }
                >
                  <View style={[estilos.tarjetaCatTop, fotoUrl ? estilos.tarjetaCatTopConFoto : { backgroundColor: fondo }]}>
                    {visualSuperior}
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
                  <View style={[estilos.tarjetaCatTop, fotoUrl ? estilos.tarjetaCatTopConFoto : { backgroundColor: fondo }]}>
                    {visualSuperior}
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
                {!modoArmarPedido && !modoSeleccionPdf && (
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
      modoSeleccionPdf,
      navigation,
      seleccionIds,
      seleccionPdfIds,
      toggleSeleccion,
      toggleSeleccionPdf,
      agregarProducto,
      handleEliminar,
      cardWidthGrid,
    ],
  );

  const irAPedidoConCarrito = useCallback(() => {
    if (lineas.length === 0) {
      mostrarAlerta('Carrito vacío', 'Agregá productos o servicios al carrito antes de continuar.');
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

  const confirmarVaciarCarrito = useCallback(() => {
    confirmarYEntonces(
      'Vaciar carrito',
      '¿Quitar todos los productos del carrito?',
      { textoAceptar: 'Vaciar', destructivo: true },
      () => {
        limpiarCarrito();
      },
    );
  }, [limpiarCarrito]);

  const mostrarBarraCarrito = unidadesEnCarrito > 0;
  const FAB_H = 58;
  const FAB_GAP = 12;
  const offsetFab = mostrarBarraCarrito ? 108 : 24;
  const fabArmarBottom = offsetFab + FAB_H + FAB_GAP;

  const paddingBottomLista = useMemo(() => {
    const off = mostrarBarraCarrito ? 108 : 24;
    const armarB = off + FAB_H + FAB_GAP;
    let base = 100;
    if (mostrarBarraCarrito) base = 180;
    if (modoSeleccionPdf) {
      return Math.max(base, off + FAB_H + 28);
    }
    if (!modoArmarPedido) return Math.max(base, armarB + FAB_H + 28);
    if (seleccionIds.size > 0) return Math.max(base, off + FAB_H + 72 + 56);
    return Math.max(base, off + FAB_H + 28);
  }, [mostrarBarraCarrito, modoArmarPedido, modoSeleccionPdf, seleccionIds.size]);

  if (cargando && productos.length === 0) return <CargandoSpinner />;
  if (error) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

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

        {!modoArmarPedido && productos.some((p) => p.tipo === 'bien') && !modoSeleccionPdf && (
          <View style={estilos.filaBtnsPdf}>
            <TouchableOpacity
              style={estilos.btnCompartirCatalogo}
              onPress={compartirCatalogoPdf}
              disabled={generandoPdf}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Compartir todo el catálogo con tus clientes"
            >
              {generandoPdf ? (
                <ActivityIndicator size="small" color={COLORES.blanco} />
              ) : (
                <Ionicons name="share-outline" size={20} color={COLORES.blanco} />
              )}
              <Text style={estilos.btnCompartirCatalogoTxt} numberOfLines={2}>
                {generandoPdf ? 'Preparando…' : 'Todo el catálogo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={estilos.btnSeleccionarPdf}
              onPress={() => {
                setModoArmarPedido(false);
                setSeleccionIds(new Set());
                setModoSeleccionPdf(true);
                setSeleccionPdfIds(new Set());
              }}
              disabled={generandoPdf}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Elegir qué productos incluir antes de compartir"
            >
              <Ionicons name="checkbox-outline" size={20} color={COLORES.primario} />
              <Text style={estilos.btnSeleccionarPdfTxt} numberOfLines={2}>
                Elegir productos
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {modoSeleccionPdf && (
          <>
            <Text style={estilos.hintModoPedido}>
              Tocá las tarjetas de los productos que querés compartir. Los servicios no se incluyen.
            </Text>
            <TouchableOpacity
              style={[estilos.btnPdfSeleccion, seleccionPdfIds.size === 0 && estilos.btnPdfSeleccionDisabled]}
              onPress={compartirCatalogoPdfSeleccion}
              disabled={generandoPdf || seleccionPdfIds.size === 0}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Compartir ${seleccionPdfIds.size} productos elegidos`}
            >
              {generandoPdf ? (
                <ActivityIndicator size="small" color={COLORES.blanco} />
              ) : (
                <Ionicons name="share-outline" size={20} color={COLORES.blanco} />
              )}
              <Text style={estilos.btnPdfSeleccionTxt}>
                {generandoPdf
                  ? 'Preparando…'
                  : seleccionPdfIds.size === 0
                    ? 'Compartir elegidos'
                    : `Compartir (${seleccionPdfIds.size})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={salirModoSeleccionPdf}
              disabled={generandoPdf}
              style={estilos.btnCancelarSeleccionPdf}
              hitSlop={8}
            >
              <Text style={estilos.btnCancelarSeleccionPdfTxt}>Cancelar selección</Text>
            </TouchableOpacity>
          </>
        )}

        {modoArmarPedido && (
          <Text style={estilos.hintModoPedido}>
            Tocá las tarjetas para marcarlas. Revisá la selección con el botón inferior antes de sumarla al carrito.
          </Text>
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
          { paddingBottom: paddingBottomLista },
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
        extraData={`${anchoVentana}-${modoArmarPedido}-${seleccionIds.size}-${modoSeleccionPdf}-${seleccionPdfIds.size}`}
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

      {modoArmarPedido && seleccionIds.size > 0 && (
        <View style={[estilos.pieRevisarSeleccion, { bottom: offsetFab + FAB_H + 12 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={estilos.pieRevisarBtn}
            onPress={() =>
              navigation.navigate('AgregarSeleccionCatalogo', { productoIds: Array.from(seleccionIds) })
            }
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Revisar ${seleccionIds.size} productos seleccionados`}
          >
            <Ionicons name="layers-outline" size={22} color={COLORES.blanco} />
            <Text style={estilos.pieRevisarTxt}>Revisar {seleccionIds.size} seleccionados</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORES.blanco} />
          </TouchableOpacity>
        </View>
      )}

      {!modoArmarPedido && !modoSeleccionPdf && (
        <>
          <FAB
            icono="cart-outline"
            onPress={() => {
              salirModoSeleccionPdf();
              setModoArmarPedido(true);
              setSeleccionIds(new Set());
            }}
            estilo={{ bottom: fabArmarBottom }}
          />
          <FAB
            icono="add"
            onPress={() => navigation.navigate('FormProducto', {})}
            estilo={{ bottom: offsetFab }}
          />
        </>
      )}

      {modoArmarPedido && (
        <FAB
          icono="close"
          color={COLORES.textoSecundario}
          colorIcono={COLORES.blanco}
          onPress={() => {
            setModoArmarPedido(false);
            setSeleccionIds(new Set());
          }}
          estilo={{ bottom: offsetFab }}
        />
      )}

      {modoSeleccionPdf && (
        <FAB
          icono="close"
          color={COLORES.textoSecundario}
          colorIcono={COLORES.blanco}
          onPress={salirModoSeleccionPdf}
          estilo={{ bottom: offsetFab }}
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
  filaBtnsPdf: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: ESPACIADO.sm,
    marginBottom: ESPACIADO.xs,
  },
  btnCompartirCatalogo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORES.exito,
    borderRadius: RADIO.md,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.xs,
  },
  btnCompartirCatalogoTxt: {
    color: COLORES.blanco,
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    textAlign: 'center',
  },
  btnSeleccionarPdf: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.md,
    borderWidth: 1.5,
    borderColor: COLORES.primario,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.xs,
  },
  btnSeleccionarPdfTxt: {
    color: COLORES.primario,
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    textAlign: 'center',
  },
  btnPdfSeleccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primario,
    borderRadius: RADIO.lg,
    paddingVertical: ESPACIADO.sm + 2,
    paddingHorizontal: ESPACIADO.md,
    marginBottom: ESPACIADO.xs,
  },
  btnPdfSeleccionDisabled: {
    opacity: 0.45,
  },
  btnPdfSeleccionTxt: {
    color: COLORES.blanco,
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
  },
  btnCancelarSeleccionPdf: {
    alignSelf: 'center',
    paddingVertical: ESPACIADO.xs,
    marginBottom: ESPACIADO.xs,
  },
  btnCancelarSeleccionPdfTxt: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoSemibold,
  },
  hintModoPedido: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 17,
    marginBottom: ESPACIADO.xs,
  },
  pieRevisarSeleccion: {
    position: 'absolute',
    left: ESPACIADO.md,
    right: ESPACIADO.md,
    zIndex: 30,
  },
  pieRevisarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primario,
    paddingVertical: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.md,
    borderRadius: RADIO.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 8,
  },
  pieRevisarTxt: {
    flexShrink: 1,
    textAlign: 'center',
    color: COLORES.blanco,
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
  },
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
  tarjetaCatTopConFoto: {
    paddingTop: 0,
    paddingBottom: 0,
    height: 72,
    overflow: 'hidden',
  },
  tarjetaCatFoto: {
    width: '100%',
    height: '100%',
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
