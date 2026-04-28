import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { estilos } from './CrearPedido.estilos';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PedidosStackParamList } from '../../navegacion/tipos';
import { usePedidos } from '../../hooks/usePedidos';
import { usePersonas } from '../../hooks/usePersonas';
import { useWallet } from '../../contexto/WalletContext';
import { useCarritoCatalogoPedido, LineaCarritoCatalogo } from '../../contexto/CarritoCatalogoContext';
import { productosServicio } from '../../servicios/productos.servicio';
import { TipoPedido, TipoItem, CrearItemDto, Persona, Producto } from '../../tipos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import SelectorToggle from '../../componentes/SelectorToggle';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { parsearNumero, formatearMoneda } from '../../utilidades/formato';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<PedidosStackParamList, 'CrearPedido'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ItemForm {
  id: string;
  productoId?: number;
  tipo: TipoItem;
  nombre: string;
  cantidad: string;
  precioCompra: string;
  precioVenta: string;
}

const nuevoItem = (): ItemForm => ({
  id: String(Date.now() + Math.random()),
  tipo: 'bien',
  nombre: '',
  cantidad: '1',
  precioCompra: '',
  precioVenta: '',
});

const lineaCarritoCatalogoAItemForm = (l: LineaCarritoCatalogo): ItemForm => ({
  id: String(Date.now() + Math.random()),
  productoId: l.productoId,
  tipo: l.tipo,
  nombre: l.nombre,
  cantidad: String(l.cantidad),
  precioCompra: String(l.precioCompra),
  precioVenta: String(l.precioVenta),
});

const OPCIONES_TIPO_ITEM: { valor: TipoItem; etiqueta: string }[] = [
  { valor: 'bien', etiqueta: 'Producto' },
  { valor: 'servicio', etiqueta: 'Servicio' },
];

/** Tres caminos de creación; el API sigue siendo `tipo` compra | venta. */
type ModoCreacionPedido = 'compra' | 'venta_cliente' | 'venta_proveedor';

type ConfigModoCreacion = {
  valor: ModoCreacionPedido;
  tituloCorto: string;
  ayuda: string;
  icono: IoniconName;
  color: string;
  fondo: string;
};

const MODOS_CREACION: ConfigModoCreacion[] = [
  {
    valor: 'compra',
    tituloCorto: 'Compra',
    ayuda: 'Registrás una compra a un proveedor; los pagos van contra este pedido.',
    icono: 'arrow-down-circle',
    color: COLORES.morado,
    fondo: COLORES.moradoClaro,
  },
  {
    valor: 'venta_cliente',
    tituloCorto: 'Venta\ncliente',
    ayuda: 'Vendés a un cliente. Podés sumar un proveedor de costo aparte (opcional).',
    icono: 'person',
    color: COLORES.primario,
    fondo: COLORES.primarioClaro,
  },
  {
    valor: 'venta_proveedor',
    tituloCorto: 'Venta\nproveedor',
    ayuda: 'Sin cliente en la app: solo costos y pagos vinculados a un proveedor.',
    icono: 'business',
    color: COLORES.proveedor,
    fondo: COLORES.proveedorClaro,
  },
];

/** Selector compacto: tres píldoras en fila + una línea de ayuda según la opción activa. */
const SelectorModoCreacion: React.FC<{ valor: ModoCreacionPedido; onChange: (v: ModoCreacionPedido) => void }> = ({ valor, onChange }) => {
  const ayudaActiva = MODOS_CREACION.find((m) => m.valor === valor)?.ayuda ?? '';
  return (
    <View style={estilosTipo.contenedor}>
      <Text style={estilosTipo.etiqueta}>Tipo de pedido</Text>
      <View style={estilosTipo.filaPills}>
        {MODOS_CREACION.map((modo) => {
          const activo = valor === modo.valor;
          return (
            <TouchableOpacity
              key={modo.valor}
              style={[estilosTipo.pill, activo && { borderColor: modo.color, backgroundColor: modo.fondo }]}
              onPress={() => onChange(modo.valor)}
              activeOpacity={0.85}
            >
              <Ionicons name={modo.icono} size={17} color={activo ? modo.color : COLORES.textoSecundario} />
              <Text
                style={[estilosTipo.pillTexto, activo && { color: modo.color, fontWeight: FUENTE.pesoSemibold }]}
                numberOfLines={2}
              >
                {modo.tituloCorto}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={estilosTipo.ayudaUnaLinea}>{ayudaActiva}</Text>
    </View>
  );
};

const estilosTipo = StyleSheet.create({
  contenedor: { marginBottom: ESPACIADO.md },
  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filaPills: { flexDirection: 'row', gap: ESPACIADO.xs },
  pill: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: 4,
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
  },
  pillTexto: {
    fontSize: 11,
    lineHeight: 13,
    color: COLORES.texto,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  ayudaUnaLinea: {
    marginTop: ESPACIADO.sm,
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    lineHeight: 19,
    textAlign: 'center',
  },
});
// ─────────────────────────────────────────────────────────────────────────────

const CrearPedido: React.FC<Props> = ({ navigation, route }) => {
  const { crear } = usePedidos();
  const { personas, cargar: cargarPersonas } = usePersonas();
  const { walletSeleccionado } = useWallet();
  const { consumirLineasSiTransferenciaPendiente } = useCarritoCatalogoPedido();

  const [modoCreacion, setModoCreacion] = useState<ModoCreacionPedido>('venta_cliente');
  const tipoPedido: TipoPedido = modoCreacion === 'compra' ? 'compra' : 'venta';
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Persona | null>(null);
  const [modalPersona, setModalPersona] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(false);

  const [items, setItems] = useState<ItemForm[]>([nuevoItem()]);
  const [pagoInicial, setPagoInicial] = useState('');
  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarImpuesto, setMostrarImpuesto] = useState(false);
  const [impuesto, setImpuesto] = useState('');
  const [nombreReferencia, setNombreReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Catálogo de productos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [itemIdCatalogo, setItemIdCatalogo] = useState<string | null>(null);
  // Selección múltiple desde catálogo
  const [modalCatalogoMulti, setModalCatalogoMulti] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (route.params?.personaId) {
      const p = personas.find((x) => x.id === route.params.personaId);
      if (p) {
        setPersonaSeleccionada(p);
        setModoCreacion(p.tipo === 'cliente' ? 'venta_cliente' : 'compra');
        if (p.tipo === 'proveedor') setProveedorSeleccionado(null);
      }
    }
  }, [route.params?.personaId, personas]);

  useFocusEffect(
    useCallback(() => {
      cargarPersonas();
      if (walletSeleccionado) {
        productosServicio.listarPorWallet(walletSeleccionado.id).then(setProductos).catch(() => {});
      }
      const precargadas = consumirLineasSiTransferenciaPendiente();
      if (precargadas.length > 0) {
        setItems(precargadas.map(lineaCarritoCatalogoAItemForm));
      }
    }, [consumirLineasSiTransferenciaPendiente, cargarPersonas, walletSeleccionado]),
  );

  useEffect(() => {
    if (modoCreacion === 'compra') {
      setProveedorSeleccionado(null);
      if (personaSeleccionada && personaSeleccionada.tipo !== 'proveedor') setPersonaSeleccionada(null);
      return;
    }
    if (modoCreacion === 'venta_proveedor') {
      setPersonaSeleccionada(null);
      return;
    }
    // venta_cliente
    if (personaSeleccionada && personaSeleccionada.tipo !== 'cliente') setPersonaSeleccionada(null);
  }, [modoCreacion]);

  /** Desde detalle de un proveedor: al elegir «Venta proveedor», prellenar ese contacto. */
  useEffect(() => {
    if (modoCreacion !== 'venta_proveedor' || route.params?.personaId == null) return;
    const p = personas.find((x) => x.id === route.params.personaId);
    if (!p || p.tipo !== 'proveedor') return;
    setProveedorSeleccionado((prev) => (prev == null ? p : prev));
  }, [modoCreacion, route.params?.personaId, personas]);

  const actualizarItem = useCallback((id: string, campo: keyof ItemForm, valor: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }, []);

  const agregarItem = useCallback(() => setItems((prev) => [...prev, nuevoItem()]), []);

  const eliminarItem = useCallback((id: string) => {
    setItems((prev) => prev.length <= 1 ? prev : prev.filter((it) => it.id !== id));
  }, []);

  const abrirCatalogo = useCallback((itemId: string) => {
    setItemIdCatalogo(itemId);
    setModalCatalogo(true);
  }, []);

  const seleccionarProducto = useCallback((producto: Producto) => {
    if (!itemIdCatalogo) return;
    setItems((prev) => prev.map((it) => it.id === itemIdCatalogo ? {
      ...it,
      productoId: producto.id,
      nombre: producto.nombre,
      tipo: producto.tipo,
      precioCompra: String(producto.precioProveedor),
      precioVenta: String(producto.precioEmpresa),
    } : it));
    setModalCatalogo(false);
    setItemIdCatalogo(null);
  }, [itemIdCatalogo]);

  // ─── Selección múltiple desde catálogo ────────────────────────────────────
  const toggleSeleccion = useCallback((productoId: number) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(productoId)) {
        nuevo.delete(productoId);
      } else {
        nuevo.add(productoId);
      }
      return nuevo;
    });
  }, []);

  const confirmarSeleccionMultiple = useCallback(() => {
    const productosElegidos = productos.filter((p) => seleccionados.has(p.id));
    if (productosElegidos.length === 0) return;

    setItems((prev) => {
      // Si el primer ítem está vacío (el ítem por defecto sin nombre), lo reemplazamos
      const primerVacio = prev.length === 1 && !prev[0].nombre.trim() ? prev[0].id : null;
      const nuevosItems = productosElegidos.map((p, idx) => ({
        id: primerVacio && idx === 0 ? primerVacio : String(Date.now() + Math.random() + idx),
        productoId: p.id,
        tipo: p.tipo,
        nombre: p.nombre,
        cantidad: '1',
        precioCompra: String(p.precioProveedor),
        precioVenta: String(p.precioEmpresa),
      }));
      if (primerVacio) {
        // Reemplazar el ítem vacío con el primer producto y agregar el resto
        return [...prev.filter((it) => it.id !== primerVacio), ...nuevosItems];
      }
      return [...prev, ...nuevosItems];
    });

    setSeleccionados(new Set());
    setModalCatalogoMulti(false);
  }, [productos, seleccionados]);

  const validar = (): boolean => {
    if (modoCreacion === 'compra') {
      if (!personaSeleccionada) {
        mostrarAlerta('Falta el proveedor', 'Seleccioná a quién le comprás.');
        return false;
      }
    } else if (modoCreacion === 'venta_cliente') {
      if (!personaSeleccionada) {
        mostrarAlerta('Falta el cliente', 'Seleccioná el cliente de esta venta.');
        return false;
      }
    } else if (!proveedorSeleccionado) {
      mostrarAlerta('Falta el proveedor', 'En «Venta por proveedor» tenés que elegir el proveedor de costo.');
      return false;
    }
    for (const item of items) {
      if (!item.nombre.trim()) { mostrarAlerta('Nombre requerido', 'Todos los ítems deben tener un nombre'); return false; }
      if (parsearNumero(item.cantidad) <= 0) { mostrarAlerta('Cantidad inválida', 'La cantidad debe ser mayor a 0'); return false; }
      if (parsearNumero(item.precioCompra) <= 0 || parsearNumero(item.precioVenta) <= 0) {
        mostrarAlerta('Precios requeridos', `Ingresá precio costo y precio venta en "${item.nombre || 'ítem'}"`);
        return false;
      }
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const itemsDto: CrearItemDto[] = items.map((it) => ({
        productoId: it.productoId,
        tipo: it.tipo,
        nombre: it.nombre.trim(),
        cantidad: parsearNumero(it.cantidad),
        precioCompra: parsearNumero(it.precioCompra),
        precioVenta: parsearNumero(it.precioVenta),
      }));
      const montoInicial = parsearNumero(pagoInicial);
      const impuestoNum = mostrarImpuesto ? parsearNumero(impuesto) : undefined;
      const pedido = await crear({
        ...(personaSeleccionada ? { personaId: personaSeleccionada.id } : {}),
        ...(proveedorSeleccionado ? { proveedorId: proveedorSeleccionado.id } : {}),
        tipo: tipoPedido,
        nombreReferencia: nombreReferencia.trim() || undefined,
        impuesto: impuestoNum && impuestoNum > 0 ? impuestoNum : undefined,
        items: itemsDto,
        pagoInicial: mostrarPago && montoInicial > 0 ? { monto: montoInicial } : undefined,
      });
      navigation.replace('DetallePedido', { pedidoId: pedido.id });
    } catch (e: unknown) {
      mostrarAlerta('Error al crear pedido', e instanceof Error ? e.message : 'Intentá nuevamente');
    } finally {
      setGuardando(false);
    }
  };

  // NUNCA hacer fallback a personas de tipo incorrecto: si no hay clientes para una venta,
  // mostrar lista vacía con mensaje — no mezclar proveedores como posibles clientes
  const personasModal = personas.filter((p) =>
    modoCreacion === 'venta_cliente' ? p.tipo === 'cliente' : p.tipo === 'proveedor',
  );
  const proveedoresDisponibles = personas.filter((p) => p.tipo === 'proveedor');

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <SelectorModoCreacion valor={modoCreacion} onChange={setModoCreacion} />

          {/* Compra: una sola sección — proveedor principal */}
          {modoCreacion === 'compra' && (
            <View style={estilosSeccion.tarjeta}>
              <Text style={estilosSeccion.titulo}>Proveedor</Text>
              <Text style={estilosSeccion.descripcion}>Persona a la que le comprás; los pagos del pedido van contra este contacto.</Text>
              <Text style={estilos.etiqueta}>Elegí proveedor</Text>
              <TouchableOpacity
                style={[estilos.selectorPersona, !personaSeleccionada && estilos.selectorPersonaVacio, { marginBottom: 0 }]}
                onPress={() => setModalPersona(true)}
                activeOpacity={0.85}
              >
                {personaSeleccionada ? (
                  <View style={estilos.personaSeleccionada}>
                    <View style={[estilos.avatarPequeno, { backgroundColor: COLORES.proveedorClaro }]}>
                      <Text style={[estilos.avatarLetra, { color: COLORES.proveedor }]}>
                        {personaSeleccionada.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.personaNombre}>{personaSeleccionada.nombre}</Text>
                      <Text style={estilos.personaTipo}>Proveedor</Text>
                    </View>
                    <View style={estilos.cambiarBtn}><Text style={estilos.cambiarTexto}>Cambiar</Text></View>
                  </View>
                ) : (
                  <View style={estilos.personaPlaceholder}>
                    <View style={estilos.placeholderIcon}>
                      <Ionicons name="business-outline" size={20} color={COLORES.textoDeshabilitado} />
                    </View>
                    <Text style={estilos.placeholderTexto}>Seleccioná el proveedor</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Venta a cliente: cliente + proveedor de costo opcional */}
          {modoCreacion === 'venta_cliente' && (
            <>
              <View style={estilosSeccion.tarjeta}>
                <Text style={estilosSeccion.titulo}>Cliente</Text>
                <Text style={estilosSeccion.descripcion}>A quién le facturás o cobrás en este pedido.</Text>
                <Text style={estilos.etiqueta}>Elegí cliente</Text>
                <TouchableOpacity
                  style={[estilos.selectorPersona, !personaSeleccionada && estilos.selectorPersonaVacio, { marginBottom: 0 }]}
                  onPress={() => setModalPersona(true)}
                  activeOpacity={0.85}
                >
                  {personaSeleccionada ? (
                    <View style={estilos.personaSeleccionada}>
                      <View style={[estilos.avatarPequeno, { backgroundColor: COLORES.clienteClaro }]}>
                        <Text style={[estilos.avatarLetra, { color: COLORES.cliente }]}>
                          {personaSeleccionada.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.personaNombre}>{personaSeleccionada.nombre}</Text>
                        <Text style={estilos.personaTipo}>Cliente</Text>
                      </View>
                      <View style={estilos.cambiarBtn}><Text style={estilos.cambiarTexto}>Cambiar</Text></View>
                    </View>
                  ) : (
                    <View style={estilos.personaPlaceholder}>
                      <View style={estilos.placeholderIcon}>
                        <Ionicons name="person-add-outline" size={20} color={COLORES.textoDeshabilitado} />
                      </View>
                      <Text style={estilos.placeholderTexto}>Seleccioná el cliente</Text>
                      <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={estilosSeccion.tarjeta}>
                <View style={estilosProveedor.header}>
                  <Text style={estilosSeccion.titulo}>Proveedor de costo</Text>
                  <Text style={estilosProveedor.opcional}>(opcional)</Text>
                </View>
                <Text style={estilosSeccion.descripcion}>
                  Si alguien más te surte el costo o liquidás con él aparte del cliente, vinculalo acá.
                </Text>
                <TouchableOpacity
                  style={[estilos.selectorPersona, !proveedorSeleccionado && estilos.selectorPersonaVacio, { marginBottom: 0 }]}
                  onPress={() => setModalProveedor(true)}
                  activeOpacity={0.85}
                >
                  {proveedorSeleccionado ? (
                    <View style={estilos.personaSeleccionada}>
                      <View style={[estilos.avatarPequeno, { backgroundColor: COLORES.proveedorClaro }]}>
                        <Text style={[estilos.avatarLetra, { color: COLORES.proveedor }]}>
                          {proveedorSeleccionado.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.personaNombre}>{proveedorSeleccionado.nombre}</Text>
                        <Text style={estilos.personaTipo}>Proveedor · podés registrar pagos a él</Text>
                      </View>
                      <TouchableOpacity onPress={() => setProveedorSeleccionado(null)} style={estilosProveedor.quitarBtn}>
                        <Ionicons name="close-circle" size={20} color={COLORES.textoDeshabilitado} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={estilos.personaPlaceholder}>
                      <View style={estilos.placeholderIcon}>
                        <Ionicons name="business-outline" size={20} color={COLORES.textoDeshabilitado} />
                      </View>
                      <Text style={estilos.placeholderTexto}>¿Le compraste a alguien? (opcional)</Text>
                      <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Venta por proveedor: solo proveedor de costo (obligatorio) */}
          {modoCreacion === 'venta_proveedor' && (
            <View style={estilosSeccion.tarjeta}>
              <Text style={estilosSeccion.titulo}>Proveedor de costo</Text>
              <Text style={estilosSeccion.descripcion}>
                No registrás cliente final en la app. El pedido queda vinculado a este proveedor para costos y pagos.
              </Text>
              <Text style={estilos.etiqueta}>Elegí proveedor (obligatorio)</Text>
              <TouchableOpacity
                style={[estilos.selectorPersona, !proveedorSeleccionado && estilos.selectorPersonaVacio, { marginBottom: 0 }]}
                onPress={() => setModalProveedor(true)}
                activeOpacity={0.85}
              >
                {proveedorSeleccionado ? (
                  <View style={estilos.personaSeleccionada}>
                    <View style={[estilos.avatarPequeno, { backgroundColor: COLORES.proveedorClaro }]}>
                      <Text style={[estilos.avatarLetra, { color: COLORES.proveedor }]}>
                        {proveedorSeleccionado.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.personaNombre}>{proveedorSeleccionado.nombre}</Text>
                      <Text style={estilos.personaTipo}>Proveedor</Text>
                    </View>
                    <TouchableOpacity onPress={() => setProveedorSeleccionado(null)} style={estilosProveedor.quitarBtn}>
                      <Ionicons name="close-circle" size={20} color={COLORES.textoDeshabilitado} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={estilos.personaPlaceholder}>
                    <View style={estilos.placeholderIcon}>
                      <Ionicons name="business-outline" size={20} color={COLORES.textoDeshabilitado} />
                    </View>
                    <Text style={estilos.placeholderTexto}>Seleccioná el proveedor</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <CampoTexto
            etiqueta="Nombre o referencia del pedido (opcional)"
            placeholder="Ej: Cotización Hotel Mar · Pedido feria abril"
            value={nombreReferencia}
            onChangeText={setNombreReferencia}
            maxLength={200}
            icono="pricetag-outline"
            ayuda="Se muestra en listas y en los PDF en lugar de solo «Pedido #»."
          />

          {/* Ítems */}
          <View style={estilos.seccionHeader}>
            <Text style={estilos.etiqueta}>Ítems</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm }}>
              {productos.length > 0 && (
                <TouchableOpacity
                  style={estilosMulti.btnCatalogoCabecera}
                  onPress={() => { setSeleccionados(new Set()); setModalCatalogoMulti(true); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="grid-outline" size={13} color={COLORES.primario} />
                  <Text style={estilosMulti.btnCatalogoTexto}>Desde catálogo</Text>
                </TouchableOpacity>
              )}
              <Text style={estilos.itemsContador}>{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</Text>
            </View>
          </View>

          {items.map((item, idx) => (
            <View key={item.id} style={estilos.itemCard}>
              <View style={estilos.itemCardHeader}>
                <View style={estilos.itemNumeroBox}>
                  <Ionicons name="cube-outline" size={14} color={COLORES.primario} />
                  <Text style={estilos.itemNumero}>Ítem {idx + 1}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: ESPACIADO.sm }}>
                  {productos.length > 0 && (
                    <TouchableOpacity
                      style={[estilos.eliminarBtn, { backgroundColor: COLORES.primarioClaro }]}
                      onPress={() => abrirCatalogo(item.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="grid-outline" size={13} color={COLORES.primario} />
                      <Text style={[estilos.eliminarTexto, { color: COLORES.primario }]}>Catálogo</Text>
                    </TouchableOpacity>
                  )}
                  {items.length > 1 && (
                    <TouchableOpacity style={estilos.eliminarBtn} onPress={() => eliminarItem(item.id)} activeOpacity={0.8}>
                      <Ionicons name="trash-outline" size={14} color={COLORES.peligro} />
                      <Text style={estilos.eliminarTexto}>Quitar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <SelectorToggle opciones={OPCIONES_TIPO_ITEM} valorSeleccionado={item.tipo} onSeleccionar={(v) => actualizarItem(item.id, 'tipo', v)} />

              <CampoTexto
                etiqueta="Nombre"
                placeholder={item.tipo === 'bien' ? 'Ej: Remera talle M' : 'Ej: Corte de cabello'}
                value={item.nombre}
                onChangeText={(v) => actualizarItem(item.id, 'nombre', v)}
                maxLength={150}
              />

              <View style={estilos.filaInputs}>
                <CampoTexto etiqueta="Cantidad" placeholder="1" value={item.cantidad} onChangeText={(v) => actualizarItem(item.id, 'cantidad', v)} keyboardType="decimal-pad" contenedor={{ flex: 1, marginRight: ESPACIADO.sm }} />
                <CampoTexto etiqueta="Precio costo" placeholder="0.00" value={item.precioCompra} onChangeText={(v) => actualizarItem(item.id, 'precioCompra', v)} keyboardType="decimal-pad" contenedor={{ flex: 1, marginLeft: ESPACIADO.sm }} />
              </View>
              <CampoTexto etiqueta="Precio venta" placeholder="0.00" value={item.precioVenta} onChangeText={(v) => actualizarItem(item.id, 'precioVenta', v)} keyboardType="decimal-pad" />
            </View>
          ))}

          <TouchableOpacity style={estilos.botonAgregarItem} onPress={agregarItem} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={18} color={COLORES.primario} />
            <Text style={estilos.botonAgregarItemTexto}>Agregar otro ítem</Text>
          </TouchableOpacity>

          {/* Pago inicial */}
          <TouchableOpacity style={estilos.togglePago} onPress={() => setMostrarPago((v) => !v)} activeOpacity={0.8}>
            <View style={[estilos.checkbox, mostrarPago && estilos.checkboxActivo]}>
              {mostrarPago && <Ionicons name="checkmark" size={13} color={COLORES.blanco} />}
            </View>
            <Text style={estilos.togglePagoTitulo}>Agregar pago inicial</Text>
          </TouchableOpacity>

          {mostrarPago && (
            <CampoTexto etiqueta="Monto pagado" placeholder="0.00" value={pagoInicial} onChangeText={setPagoInicial} keyboardType="decimal-pad" icono="cash-outline" />
          )}

          {/* Impuesto opcional */}
          <TouchableOpacity style={estilos.togglePago} onPress={() => setMostrarImpuesto((v) => !v)} activeOpacity={0.8}>
            <View style={[estilos.checkbox, mostrarImpuesto && estilos.checkboxActivo]}>
              {mostrarImpuesto && <Ionicons name="checkmark" size={13} color={COLORES.blanco} />}
            </View>
            <Text style={estilos.togglePagoTitulo}>Agregar impuesto (opcional)</Text>
          </TouchableOpacity>

          {mostrarImpuesto && (
            <CampoTexto
              etiqueta="% de impuesto"
              placeholder="Ej: 12"
              value={impuesto}
              onChangeText={setImpuesto}
              keyboardType="decimal-pad"
              icono="receipt-outline"
              ayuda="Se mostrará en el PDF de cotización"
            />
          )}
        </ScrollView>

        <View style={estilos.footer}>
          <BotonPrimario titulo="Crear Pedido" onPress={handleGuardar} cargando={guardando} />
        </View>
      </KeyboardAvoidingView>

      {/* Modal: selector de persona */}
      <Modal visible={modalPersona} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilos.modalHeader}>
            <View>
              <Text style={estilos.modalTitulo}>
                {modoCreacion === 'venta_cliente' ? 'Seleccioná el cliente' : 'Seleccioná el proveedor'}
              </Text>
              <Text style={estilos.modalSubtitulo}>
                {personasModal.length} {modoCreacion === 'venta_cliente' ? 'clientes' : 'proveedores'} disponibles
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalPersona(false)} style={estilos.modalCerrarBtn}>
              <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={personasModal}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={
              modoCreacion === 'venta_cliente' && personaSeleccionada ? (
                <TouchableOpacity
                  style={{ paddingVertical: ESPACIADO.md, marginBottom: ESPACIADO.xs }}
                  onPress={() => {
                    setPersonaSeleccionada(null);
                    setModalPersona(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: COLORES.textoSecundario, fontSize: FUENTE.tamanoPequeno, textAlign: 'center' }}>
                    Quitar cliente
                  </Text>
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={estilos.modalItem} onPress={() => { setPersonaSeleccionada(item); setModalPersona(false); }} activeOpacity={0.85}>
                <View style={[estilos.avatarPequeno, { backgroundColor: item.tipo === 'cliente' ? COLORES.clienteClaro : COLORES.proveedorClaro }]}>
                  <Text style={[estilos.avatarLetra, { color: item.tipo === 'cliente' ? COLORES.cliente : COLORES.proveedor }]}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.personaNombre}>{item.nombre}</Text>
                  <Text style={estilos.personaTipo}>{item.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORES.borde, marginHorizontal: ESPACIADO.md }} />}
            contentContainerStyle={{ padding: ESPACIADO.md }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: ESPACIADO.xl, gap: ESPACIADO.sm }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORES.grisClaro, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people-outline" size={30} color={COLORES.textoDeshabilitado} />
                </View>
                <Text style={{ color: COLORES.texto, fontWeight: FUENTE.pesoSemibold, fontSize: FUENTE.tamanoBase }}>
                  Sin {modoCreacion === 'venta_cliente' ? 'clientes' : 'proveedores'}
                </Text>
                <Text style={{ color: COLORES.textoSecundario, textAlign: 'center', fontSize: FUENTE.tamanoPequeno }}>
                  Agregá {modoCreacion === 'venta_cliente' ? 'un cliente' : 'un proveedor'} primero
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Modal: selector de proveedor asociado */}
      <Modal visible={modalProveedor} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilos.modalHeader}>
            <View>
              <Text style={estilos.modalTitulo}>Proveedor de costo</Text>
              <Text style={estilos.modalSubtitulo}>
                {modoCreacion === 'venta_proveedor'
                  ? 'Obligatorio: el pedido queda anclado a este contacto.'
                  : 'Opcional: ¿a quién le compraste el costo de esta venta?'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalProveedor(false)} style={estilos.modalCerrarBtn}>
              <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={proveedoresDisponibles}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={estilos.modalItem}
                onPress={() => { setProveedorSeleccionado(item); setModalProveedor(false); }}
                activeOpacity={0.85}
              >
                <View style={[estilos.avatarPequeno, { backgroundColor: COLORES.proveedorClaro }]}>
                  <Text style={[estilos.avatarLetra, { color: COLORES.proveedor }]}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.personaNombre}>{item.nombre}</Text>
                  <Text style={estilos.personaTipo}>Proveedor</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORES.borde, marginHorizontal: ESPACIADO.md }} />}
            contentContainerStyle={{ padding: ESPACIADO.md }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: ESPACIADO.xl, gap: ESPACIADO.sm }}>
                <Ionicons name="business-outline" size={40} color={COLORES.textoDeshabilitado} />
                <Text style={{ color: COLORES.texto, fontWeight: FUENTE.pesoSemibold }}>Sin proveedores</Text>
                <Text style={{ color: COLORES.textoSecundario, textAlign: 'center', fontSize: FUENTE.tamanoPequeno }}>Agregá un proveedor primero en Personas</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Modal: catálogo de productos (reemplazo de un ítem individual) */}
      <Modal visible={modalCatalogo} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilos.modalHeader}>
            <View>
              <Text style={estilos.modalTitulo}>Catálogo</Text>
              <Text style={estilos.modalSubtitulo}>{productos.length} productos disponibles</Text>
            </View>
            <TouchableOpacity onPress={() => setModalCatalogo(false)} style={estilos.modalCerrarBtn}>
              <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={productos}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={estilos.modalItem}
                onPress={() => seleccionarProducto(item)}
                activeOpacity={0.85}
              >
                <View style={[estilosLocales.iconBox, { backgroundColor: item.tipo === 'bien' ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                  <Ionicons name={item.tipo === 'bien' ? 'cube-outline' : 'construct-outline'} size={16} color={item.tipo === 'bien' ? COLORES.primario : COLORES.morado} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.personaNombre}>{item.nombre}</Text>
                  <Text style={estilos.personaTipo}>Costo: {formatearMoneda(item.precioProveedor)} · Venta: {formatearMoneda(item.precioEmpresa)}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={COLORES.primario} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORES.borde, marginHorizontal: ESPACIADO.md }} />}
            contentContainerStyle={{ padding: ESPACIADO.md }}
          />
        </SafeAreaView>
      </Modal>

      {/* Modal: selección MÚLTIPLE desde catálogo */}
      <Modal visible={modalCatalogoMulti} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilos.modalHeader}>
            <View>
              <Text style={estilos.modalTitulo}>Seleccionar productos</Text>
              <Text style={estilos.modalSubtitulo}>
                {seleccionados.size === 0
                  ? 'Tocá para seleccionar'
                  : `${seleccionados.size} producto${seleccionados.size !== 1 ? 's' : ''} seleccionado${seleccionados.size !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalCatalogoMulti(false)} style={estilos.modalCerrarBtn}>
              <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={productos}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const estaSeleccionado = seleccionados.has(item.id);
              return (
                <TouchableOpacity
                  style={[estilos.modalItem, estaSeleccionado && estilosMulti.itemSeleccionado]}
                  onPress={() => toggleSeleccion(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={[estilosLocales.iconBox, { backgroundColor: item.tipo === 'bien' ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                    <Ionicons name={item.tipo === 'bien' ? 'cube-outline' : 'construct-outline'} size={16} color={item.tipo === 'bien' ? COLORES.primario : COLORES.morado} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[estilos.personaNombre, estaSeleccionado && { color: COLORES.primario }]}>{item.nombre}</Text>
                    <Text style={estilos.personaTipo}>Costo: {formatearMoneda(item.precioProveedor)} · Venta: {formatearMoneda(item.precioEmpresa)}</Text>
                  </View>
                  <View style={[estilosMulti.checkbox, estaSeleccionado && estilosMulti.checkboxActivo]}>
                    {estaSeleccionado && <Ionicons name="checkmark" size={14} color={COLORES.blanco} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORES.borde, marginHorizontal: ESPACIADO.md }} />}
            contentContainerStyle={{ paddingVertical: ESPACIADO.sm }}
          />

          {seleccionados.size > 0 && (
            <View style={estilosMulti.footerMulti}>
              <TouchableOpacity style={estilosMulti.botonConfirmar} onPress={confirmarSeleccionMultiple} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={20} color={COLORES.blanco} />
                <Text style={estilosMulti.botonConfirmarTexto}>
                  Agregar {seleccionados.size} producto{seleccionados.size !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

/** Tarjetas que agrupan título + descripción + selector (orden visual por modo). */
const estilosSeccion = StyleSheet.create({
  tarjeta: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  titulo: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.xs,
  },
  descripcion: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    lineHeight: 20,
    marginBottom: ESPACIADO.sm,
  },
});

const estilosProveedor = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm, marginBottom: ESPACIADO.sm },
  opcional: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, fontStyle: 'italic' },
  quitarBtn: { padding: 4 },
});

const estilosLocales = StyleSheet.create({
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const estilosMulti = StyleSheet.create({
  btnCatalogoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.lg,
    paddingVertical: 5,
    paddingHorizontal: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: COLORES.primario,
  },
  btnCatalogoTexto: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.primario,
  },
  itemSeleccionado: {
    backgroundColor: COLORES.primarioClaro,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORES.bordeOscuro,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ESPACIADO.sm,
  },
  checkboxActivo: {
    backgroundColor: COLORES.primario,
    borderColor: COLORES.primario,
  },
  footerMulti: {
    padding: ESPACIADO.md,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    backgroundColor: COLORES.fondo,
  },
  botonConfirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primario,
    borderRadius: RADIO.xl,
    paddingVertical: 14,
  },
  botonConfirmarTexto: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
  },
});

export default CrearPedido;
