import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { estilos } from './DetallePedido.estilos';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PedidosStackParamList } from '../../navegacion/tipos';
import { usePedidoDetalle } from '../../hooks/usePedidos';
import { useWallet } from '../../contexto/WalletContext';
import { productosServicio } from '../../servicios/productos.servicio';
import { pedidosServicio } from '../../servicios/pedidos.servicio';
import { mensajeUsuarioDesdeErrorApi } from '../../servicios/api';
import { perfilServicio, PerfilEmpresa } from '../../servicios/perfil.servicio';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import EstadoBadge from '../../componentes/EstadoBadge';
import BotonPrimario from '../../componentes/BotonPrimario';
import CampoTexto from '../../componentes/CampoTexto';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { formatearMoneda, formatearFecha, parsearNumero, etiquetaPedido } from '../../utilidades/formato';
import { generarYCompartirPDF, TipoPDF } from '../../utilidades/pdf';
import { mostrarAlerta, confirmarYEntonces } from '../../utilidades/alertaPlataforma';
import { ItemPedido, Producto, TipoItem, TipoPagoProveedor } from '../../tipos';

type Props = NativeStackScreenProps<PedidosStackParamList, 'DetallePedido'>;

interface ItemEditable {
  itemId: number | null; // null = nuevo ítem
  productoId?: number;
  tipo: TipoItem;
  nombre: string;
  cantidad: string;
  precioCompra: string;
  precioVenta: string;
}

const itemVacio = (): ItemEditable => ({ itemId: null, tipo: 'bien', nombre: '', cantidad: '1', precioCompra: '', precioVenta: '' });
const itemDesdeExistente = (item: ItemPedido): ItemEditable => ({
  itemId: item.id,
  productoId: item.productoId,
  tipo: item.tipo,
  nombre: item.nombre,
  cantidad: String(item.cantidad),
  precioCompra: String(item.precioCompra),
  precioVenta: String(item.precioVenta),
});

const DetallePedido: React.FC<Props> = ({ navigation, route }) => {
  const { pedidoId } = route.params;
  const {
    pedido,
    cargando,
    error,
    cargar,
    agregarPago,
    agregarPagoProveedor,
    eliminarPago,
    eliminarPagoProveedor,
    agregarItem,
    actualizarItem,
    eliminarItem,
    actualizarPedido,
  } = usePedidoDetalle(pedidoId);
  const { walletSeleccionado } = useWallet();

  const [modalPago, setModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [modalPagoProveedor, setModalPagoProveedor] = useState(false);
  const [tipoMovimientoProveedor, setTipoMovimientoProveedor] = useState<TipoPagoProveedor>('pago');
  const [montoPagoProveedor, setMontoPagoProveedor] = useState('');
  const [guardandoPagoProveedor, setGuardandoPagoProveedor] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [modalPDF, setModalPDF] = useState(false);
  const [perfilEmpresa, setPerfilEmpresa] = useState<PerfilEmpresa | null>(null);

  // Item management
  const [modalItem, setModalItem] = useState(false);
  const [itemEditable, setItemEditable] = useState<ItemEditable>(itemVacio);
  const [guardandoItem, setGuardandoItem] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [modalCatalogo, setModalCatalogo] = useState(false);

  const [modalMeta, setModalMeta] = useState(false);
  const [metaNombre, setMetaNombre] = useState('');
  const [metaImpuesto, setMetaImpuesto] = useState('');
  const [guardandoMeta, setGuardandoMeta] = useState(false);
  useFocusEffect(
    useCallback(() => {
      cargar();
      const w = walletSeleccionado;
      const esEmpresa = w != null && (w.tipo === 'empresa' || w.tipo == null);
      if (esEmpresa && w.id != null) {
        perfilServicio.obtener(w.id).then(setPerfilEmpresa).catch(() => {});
      } else {
        setPerfilEmpresa(null);
      }
      if (walletSeleccionado) {
        productosServicio.listarPorWallet(walletSeleccionado.id).then(setProductos).catch(() => {});
      }
    }, [cargar, walletSeleccionado]),
  );

  useEffect(() => {
    if (!pedido) return;
    const titulo = etiquetaPedido(pedido);
    navigation.setOptions({
      title: titulo.length > 34 ? `${titulo.slice(0, 32)}…` : titulo,
    });
  }, [pedido, navigation]);

  const abrirModalMeta = useCallback(() => {
    if (!pedido) return;
    setMetaNombre(pedido.nombreReferencia ?? '');
    setMetaImpuesto(pedido.impuesto != null && pedido.impuesto > 0 ? String(pedido.impuesto) : '');
    setModalMeta(true);
  }, [pedido]);

  const handleGuardarMeta = useCallback(async () => {
    const n = metaNombre.trim();
    const imp = metaImpuesto.trim();
    let impuestoPayload: number | null = null;
    if (imp !== '') {
      const impNum = parsearNumero(imp);
      if (Number.isNaN(impNum) || impNum < 0 || impNum > 100) {
        mostrarAlerta('Impuesto inválido', 'Ingresá un porcentaje entre 0 y 100, o dejá vacío para quitar el impuesto.');
        return;
      }
      impuestoPayload = impNum;
    }
    setGuardandoMeta(true);
    try {
      await actualizarPedido({
        nombreReferencia: n,
        impuesto: impuestoPayload,
      });
      setModalMeta(false);
    } catch (e: unknown) {
      mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setGuardandoMeta(false);
    }
  }, [metaNombre, metaImpuesto, actualizarPedido]);

  const handleAgregarPago = useCallback(() => {
    if (!pedido?.resumen) return;
    const r = pedido.resumen;
    const esV = pedido.tipo === 'venta';
    const tot = esV ? (r.referenciaSaldoCliente ?? r.totalVenta ?? 0) : (r.totalCompra ?? 0);
    const totalPag = r.totalPagado ?? 0;
    const saldoPendiente = r.saldoPendiente ?? Math.max(0, tot - totalPag);
    const monto = parsearNumero(montoPago);
    if (monto <= 0) {
      mostrarAlerta('Monto inválido', 'El monto debe ser mayor a 0');
      return;
    }
    if (monto > saldoPendiente) {
      confirmarYEntonces(
        'Monto excede el saldo',
        `El máximo a pagar es ${formatearMoneda(saldoPendiente)}.\n\n¿Rellenar el campo con ese monto?`,
        { textoAceptar: 'Usar saldo completo' },
        () => {
          setMontoPago(String(saldoPendiente));
        },
      );
      return;
    }
    void (async () => {
      setGuardandoPago(true);
      try {
        await agregarPago({ monto });
        setModalPago(false);
        setMontoPago('');
      } catch (e: unknown) {
        mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
      } finally {
        setGuardandoPago(false);
      }
    })();
  }, [pedido, montoPago, agregarPago]);

  const handleGenerarPDF = async (tipo: TipoPDF) => {
    if (!pedido) return;
    setModalPDF(false);
    // Esperar que la animación de cierre del modal termine antes de abrir
    // el diálogo nativo de compartir (iOS/Android bloquean dos overlays simultáneos)
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    setGenerandoPDF(true);
    try {
      await generarYCompartirPDF(pedido, tipo, perfilEmpresa);
    } catch (e: unknown) {
      mostrarAlerta('Error al generar PDF', mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleEliminarPago = (pagoId: number, monto: number) => {
    confirmarYEntonces(
      'Eliminar pago',
      `¿Eliminar el pago de ${formatearMoneda(monto)}? Esta acción no se puede deshacer.`,
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await eliminarPago(pagoId);
        } catch (e: unknown) {
          mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
        }
      },
    );
  };

  const handleEliminarPagoProveedor = (pagoId: number, monto: number, tipoMov?: TipoPagoProveedor) => {
    const esIngresoCliente = tipoMov === 'ingreso_cliente_a_proveedor';
    const esCobro = tipoMov === 'cobro';
    const tituloModal = esIngresoCliente
      ? 'Eliminar ingreso al proveedor'
      : esCobro
        ? 'Eliminar cobro del proveedor'
        : 'Eliminar pago al proveedor';
    const cuerpoModal = esIngresoCliente
      ? `¿Eliminar el ingreso registrado de ${formatearMoneda(monto)}?`
      : `¿Eliminar el ${esCobro ? 'cobro' : 'pago'} de ${formatearMoneda(monto)}?`;
    confirmarYEntonces(
      tituloModal,
      cuerpoModal,
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await eliminarPagoProveedor(pagoId);
        } catch (e: unknown) {
          mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
        }
      },
    );
  };

  const handleEliminar = () => {
    confirmarYEntonces(
      'Eliminar pedido',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await pedidosServicio.eliminar(pedidoId);
          navigation.goBack();
        } catch (e: unknown) {
          mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
        }
      },
    );
  };

  // ─── Item management ──────────────────────────────────────────────────────

  const abrirNuevoItem = () => { setItemEditable(itemVacio()); setModalItem(true); };

  const abrirEditarItem = (item: ItemPedido) => { setItemEditable(itemDesdeExistente(item)); setModalItem(true); };

  const handleEliminarItem = (item: ItemPedido) => {
    confirmarYEntonces(
      'Eliminar ítem',
      `¿Eliminar "${item.nombre}"?`,
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await eliminarItem(item.id);
        } catch (e: unknown) {
          mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
        }
      },
    );
  };

  const seleccionarProductoCatalogo = (producto: Producto) => {
    setItemEditable((prev) => ({
      ...prev,
      productoId: producto.id,
      nombre: producto.nombre,
      tipo: producto.tipo,
      precioCompra: String(producto.precioProveedor),
      precioVenta: String(producto.precioEmpresa),
    }));
    setModalCatalogo(false);
  };

  const handleGuardarItem = async () => {
    if (!itemEditable.nombre.trim()) {
      mostrarAlerta('Nombre requerido', 'Ingresá el nombre del ítem');
      return;
    }
    if (parsearNumero(itemEditable.cantidad) <= 0) {
      mostrarAlerta('Cantidad inválida', 'La cantidad debe ser mayor a 0');
      return;
    }
    if (parsearNumero(itemEditable.precioCompra) <= 0 || parsearNumero(itemEditable.precioVenta) <= 0) {
      mostrarAlerta('Precios requeridos', 'Ingresá precio costo y precio venta');
      return;
    }
    setGuardandoItem(true);
    try {
      const camposComunes = {
        tipo: itemEditable.tipo,
        nombre: itemEditable.nombre.trim(),
        cantidad: parsearNumero(itemEditable.cantidad),
        precioCompra: parsearNumero(itemEditable.precioCompra),
        precioVenta: parsearNumero(itemEditable.precioVenta),
      };
      if (itemEditable.itemId) {
        // PATCH: el backend no acepta `productoId` en ActualizarItemDto (forbidNonWhitelisted).
        await actualizarItem(itemEditable.itemId, camposComunes);
      } else {
        await agregarItem({
          ...camposComunes,
          ...(itemEditable.productoId != null ? { productoId: itemEditable.productoId } : {}),
        });
      }
      setModalItem(false);
    } catch (e: unknown) {
      mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
    } finally {
      setGuardandoItem(false);
    }
  };

  const proveedorMetrics = useMemo(() => {
    if (!pedido) {
      return { abonosProveedor: 0, cobrosProveedor: 0, netoEgresoProveedor: 0, utilidadRealProveedor: 0 };
    }
    const lista = (pedido.pagosProveedor ?? []).filter((p) => p.tipo !== 'ingreso_cliente_a_proveedor');
    const abonos = lista.filter((p) => (p.tipo ?? 'pago') === 'pago').reduce((a, p) => a + p.monto, 0);
    const cobros = lista.filter((p) => p.tipo === 'cobro').reduce((a, p) => a + p.monto, 0);
    const neto = abonos - cobros;
    const totalPagadoCliente = pedido.resumen?.totalPagado ?? 0;
    return {
      abonosProveedor: abonos,
      cobrosProveedor: cobros,
      netoEgresoProveedor: neto,
      utilidadRealProveedor: totalPagadoCliente - neto,
    };
  }, [pedido]);

  const maxIngresoClienteProveedor = useMemo(() => {
    if (!pedido?.resumen) return 0;
    const totalVentaRef = pedido.resumen.totalVenta ?? 0;
    const yaIngresos = (pedido.pagosProveedor ?? [])
      .filter((p) => p.tipo === 'ingreso_cliente_a_proveedor')
      .reduce((a, p) => a + p.monto, 0);
    return Math.max(0, totalVentaRef - yaIngresos);
  }, [pedido]);

  const abrirModalProveedor = useCallback((tipo: TipoPagoProveedor) => {
    setTipoMovimientoProveedor(tipo);
    setMontoPagoProveedor('');
    setModalPagoProveedor(true);
  }, []);

  const cerrarModalProveedor = useCallback(() => {
    setModalPagoProveedor(false);
    setMontoPagoProveedor('');
  }, []);

  const handleAgregarPagoProveedor = useCallback(() => {
    if (!pedido?.resumen) return;
    const totalCostoProv = pedido.resumen.totalCompra ?? 0;
    const totalPagProv = pedido.resumen.totalPagadoProveedor ?? 0;
    const saldoProv =
      pedido.resumen.saldoProveedor ?? Math.max(0, totalCostoProv - totalPagProv);
    const monto = parsearNumero(montoPagoProveedor);
    if (monto <= 0) {
      mostrarAlerta('Monto inválido', 'El monto debe ser mayor a 0');
      return;
    }
    if (tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor') {
      const totalVentaRef = pedido.resumen.totalVenta ?? 0;
      const yaIngresos = (pedido.pagosProveedor ?? [])
        .filter((p) => p.tipo === 'ingreso_cliente_a_proveedor')
        .reduce((a, p) => a + p.monto, 0);
      const maxIng = Math.max(0, totalVentaRef - yaIngresos);
      if (monto > maxIng + 0.01) {
        confirmarYEntonces(
          'Supera el tope',
          `La suma de «cliente pagó al proveedor» no puede pasar el total de venta (${formatearMoneda(totalVentaRef)}). Ya registrado: ${formatearMoneda(yaIngresos)}. Máximo ahora: ${formatearMoneda(maxIng)}.\n\n¿Usar ${formatearMoneda(maxIng)}?`,
          { textoAceptar: 'Usar máximo' },
          () => {
            if (maxIng > 0) setMontoPagoProveedor(String(maxIng));
          },
        );
        return;
      }
    }
    if (tipoMovimientoProveedor === 'pago' && monto > saldoProv) {
      confirmarYEntonces(
        'Monto excede el saldo',
        `El máximo a pagar es ${formatearMoneda(saldoProv)}.\n\n¿Rellenar el campo con ese monto?`,
        { textoAceptar: 'Usar saldo completo' },
        () => {
          setMontoPagoProveedor(String(saldoProv));
        },
      );
      return;
    }
    void (async () => {
      setGuardandoPagoProveedor(true);
      try {
        await agregarPagoProveedor({ monto, tipo: tipoMovimientoProveedor });
        cerrarModalProveedor();
      } catch (e: unknown) {
        mostrarAlerta('Error', mensajeUsuarioDesdeErrorApi(e));
      } finally {
        setGuardandoPagoProveedor(false);
      }
    })();
  }, [pedido, tipoMovimientoProveedor, montoPagoProveedor, agregarPagoProveedor, cerrarModalProveedor]);

  if (cargando && !pedido) return <CargandoSpinner />;
  if (error) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;
  if (!pedido) return null;

  const esVenta = pedido.tipo === 'venta';
  const sinClienteVenta = esVenta && !pedido.persona;
  const esCliente = pedido.persona?.tipo === 'cliente';
  /** Venta sin cliente pero con proveedor: el hero identifica al proveedor (no la referencia como si fuera cliente). */
  const tituloHeroPersona =
    pedido.persona?.nombre ??
    (sinClienteVenta
      ? pedido.proveedorId
        ? (pedido.proveedor?.nombre?.trim() || pedido.nombreReferencia?.trim() || 'Proveedor')
        : (pedido.nombreReferencia?.trim() || pedido.proveedor?.nombre || 'Venta sin cliente')
      : '—');
  const resumen = pedido.resumen;
  const subtotalVentaItems = resumen?.subtotalVenta ?? 0;
  const montoIvaCliente = resumen?.montoImpuestoVenta ?? 0;
  const total = esVenta ? (resumen?.totalVenta ?? 0) : (resumen?.totalCompra ?? 0);
  const totalPagado = resumen?.totalPagado ?? 0;
  const referenciaCobroCliente =
    resumen?.referenciaSaldoCliente ?? (esVenta ? (resumen?.totalVenta ?? 0) : (resumen?.totalCompra ?? 0));
  const saldo = resumen?.saldoPendiente ?? Math.max(0, referenciaCobroCliente - totalPagado);
  const estaPagado = resumen?.estado === 'pagado';
  const porcentajePagado =
    referenciaCobroCliente > 0 ? Math.min(100, Math.round((totalPagado / referenciaCobroCliente) * 100)) : 0;

  // Proveedor asociado
  const tieneProveedor = !!pedido.proveedorId;
  /** Costo/pagos al proveedor: solo ventas con cliente vinculado (no «venta solo proveedor»). */
  const mostrarLadoProveedorCosto = tieneProveedor && !!pedido.persona;
  const totalCostoProveedor = resumen?.totalCompra ?? 0;
  const totalPagadoProveedor = resumen?.totalPagadoProveedor ?? 0;
  const saldoProveedor = resumen?.saldoProveedor ?? Math.max(0, totalCostoProveedor - totalPagadoProveedor);
  const estaProveedorPagado = resumen?.estadoProveedor === 'pagado';
  const porcentajeProveedorPagado = totalCostoProveedor > 0 ? Math.min(100, Math.round((totalPagadoProveedor / totalCostoProveedor) * 100)) : 0;

  const mostrarTarjetaProveedorVentaSolo = sinClienteVenta && tieneProveedor;
  /** Misma tarjeta Proveedor que en venta cliente + proveedor; también en venta sin cliente. */
  const mostrarSeccionProveedorDetalle = mostrarLadoProveedorCosto || mostrarTarjetaProveedorVentaSolo;
  /** Referencia, impuesto y totales en el hero azul/morado (sin tarjeta blanca aparte). */
  const compraConPersonaProveedor = !esVenta && pedido.persona?.tipo === 'proveedor';
  const heroIntegraMetaProveedor =
    mostrarLadoProveedorCosto || mostrarTarjetaProveedorVentaSolo || compraConPersonaProveedor;
  const pagosProvLista = pedido.pagosProveedor ?? [];
  const pagosProveedorSoloIngreso = pagosProvLista.filter((p) => p.tipo === 'ingreso_cliente_a_proveedor');
  const totalIngresosClientesAlProveedor = pagosProveedorSoloIngreso.reduce((a, p) => a + p.monto, 0);

  const etiquetaSaldoHero =
    sinClienteVenta && tieneProveedor
      ? estaPagado
        ? 'Total acordado'
        : 'Te debe el proveedor'
      : estaPagado
        ? 'Total cobrado'
        : 'Saldo pendiente';
  const etiquetaProgresoHero =
    sinClienteVenta && tieneProveedor
      ? `${formatearMoneda(totalPagado)} que te repartió · ${porcentajePagado}%`
      : `${formatearMoneda(totalPagado)} pagado · ${porcentajePagado}%`;

  const { abonosProveedor, cobrosProveedor, netoEgresoProveedor, utilidadRealProveedor } = proveedorMetrics;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero */}
        <View style={[estilos.heroCard, { backgroundColor: estaPagado ? COLORES.exito : esVenta ? COLORES.primario : COLORES.morado }]}>
          <View style={estilos.heroTop}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: ESPACIADO.sm }}>
              <Text style={estilos.heroPersona} numberOfLines={2}>
                {tituloHeroPersona}
              </Text>
              <View style={estilos.heroBadgesFila}>
                <View style={estilos.heroBadge}>
                  <Ionicons name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={estilos.heroBadgeTexto}>{esVenta ? 'Venta' : 'Compra'}</Text>
                </View>
                <View style={estilos.heroBadge}>
                  <Ionicons
                    name={
                      sinClienteVenta && pedido.proveedorId
                        ? 'business-outline'
                        : sinClienteVenta
                          ? 'person-outline'
                          : esCliente
                            ? 'person-outline'
                            : 'business-outline'
                    }
                    size={12}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={estilos.heroBadgeTexto} numberOfLines={1}>
                    {sinClienteVenta && pedido.proveedorId
                      ? 'Proveedor'
                      : sinClienteVenta
                        ? 'Sin cliente'
                        : esCliente
                          ? 'Cliente'
                          : 'Proveedor'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={estilos.heroEstadoBox}>
              <EstadoBadge estado={resumen?.estado ?? 'pendiente'} grande varianteCobro={sinClienteVenta && tieneProveedor} />
            </View>
          </View>

          <View style={estilos.heroMontoFila}>
            <View style={{ flex: 1, minWidth: 0, marginRight: ESPACIADO.sm }}>
              <Text style={estilos.heroLabel}>{etiquetaSaldoHero}</Text>
              <Text style={estilos.heroMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {estaPagado ? formatearMoneda(total) : formatearMoneda(saldo)}
              </Text>
            </View>
            <View style={estilos.heroFechaBox}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={estilos.heroFecha}>{formatearFecha(pedido.fecha)}</Text>
            </View>
          </View>

          {!estaPagado && referenciaCobroCliente > 0 && (
            <View style={estilos.progresoWrapper}>
              <View style={estilos.progresoBar}>
                <View style={[estilos.progresoFill, { width: `${porcentajePagado}%` as any }]} />
              </View>
              <Text style={estilos.progresoTexto}>{etiquetaProgresoHero}</Text>
            </View>
          )}

          {heroIntegraMetaProveedor && (
            <>
              <View style={estilos.heroMetaDivider} />
              <View style={estilos.heroMetaBloqueUnificado}>
                <View style={estilos.heroMetaResumenFila}>
                  <Text style={estilos.heroMetaLabelResumen}>{esVenta ? 'Total venta' : 'Total compra'}</Text>
                  <View style={estilos.heroMetaValorWrap}>
                    <Text style={estilos.heroMetaTotalPrincipal} numberOfLines={1}>
                      {formatearMoneda(total)}
                    </Text>
                  </View>
                </View>
                <View style={[estilos.heroMetaResumenFila, estilos.heroMetaResumenFilaSep]}>
                  <Text style={estilos.heroMetaLabelResumen}>
                    {pedido.impuesto != null && pedido.impuesto > 0 ? `IVA (${pedido.impuesto}%)` : 'Impuesto'}
                  </Text>
                  <View style={estilos.heroMetaValorWrap}>
                    {pedido.impuesto != null && pedido.impuesto > 0 ? (
                      <Text style={estilos.heroMetaImpuestoValor} numberOfLines={2}>
                        {esVenta ? formatearMoneda(montoIvaCliente) : '—'}
                      </Text>
                    ) : (
                      <Text style={estilos.heroMetaSinImpuesto}>Sin impuesto</Text>
                    )}
                  </View>
                </View>
                <View style={estilos.heroMetaNombreSection}>
                  <Text style={estilos.heroMetaNombreEtiqueta}>Nombre o referencia</Text>
                  <View style={estilos.heroMetaNombreValorFila}>
                    <View style={estilos.heroMetaNombreTextoWrap}>
                      <Text style={estilos.heroMetaNombreTexto} numberOfLines={3}>
                        {mostrarTarjetaProveedorVentaSolo ? etiquetaPedido(pedido) : pedido.nombreReferencia?.trim() || 'Sin definir'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={estilos.heroMetaEditBtnCompact}
                      onPress={abrirModalMeta}
                      accessibilityLabel="Editar nombre e impuesto"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORES.blanco} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {!heroIntegraMetaProveedor && (
          <View style={estilosLocales.metaCard}>
            <View style={{ flex: 1, paddingRight: ESPACIADO.sm }}>
              <>
                <Text style={estilosLocales.metaLabel}>Nombre o referencia</Text>
                <Text style={estilosLocales.metaValor} numberOfLines={2}>
                  {mostrarTarjetaProveedorVentaSolo ? etiquetaPedido(pedido) : pedido.nombreReferencia?.trim() || 'Sin definir'}
                </Text>
              </>
              <Text style={[estilosLocales.metaLabel, { marginTop: ESPACIADO.sm }]}>Impuesto (ventas: suma al total a cobrar)</Text>
              <Text style={estilosLocales.metaValor}>
                {pedido.impuesto != null && pedido.impuesto > 0 ? `${pedido.impuesto}%` : 'Sin impuesto'}
              </Text>
            </View>
            <TouchableOpacity style={estilosLocales.metaEditBtn} onPress={abrirModalMeta} accessibilityLabel="Editar nombre e impuesto">
              <Ionicons name="create-outline" size={22} color={COLORES.primario} />
            </TouchableOpacity>
          </View>
        )}

        {/* Ítems */}
        <View style={estilos.card}>
          <View style={estilos.cardHeader}>
            <Text style={estilos.cardTitulo}>Ítems</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm }}>
              <View style={estilos.cardCount}>
                <Text style={estilos.cardCountTexto}>{pedido.items?.length ?? 0}</Text>
              </View>
              <TouchableOpacity
                style={estilosLocales.btnAgregarItem}
                onPress={abrirNuevoItem}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color={COLORES.primario} />
                <Text style={estilosLocales.btnAgregarItemTexto}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(pedido.items ?? []).length === 0 ? (
            <View style={estilos.sinDatosBox}>
              <Ionicons name="cube-outline" size={24} color={COLORES.textoDeshabilitado} />
              <Text style={estilos.sinDatos}>Sin ítems registrados</Text>
            </View>
          ) : (
            (pedido.items ?? []).map((item, idx) => {
              const precio = esVenta ? item.precioVenta : item.precioCompra;
              const subtotal = item.cantidad * precio;
              const esUltimo = idx === (pedido.items?.length ?? 0) - 1;
              return (
                <View key={item.id} style={[estilos.itemFila, esUltimo && { borderBottomWidth: 0 }]}>
                  <View style={[estilos.itemIconBox, { backgroundColor: item.tipo === 'bien' ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                    <Ionicons name={item.tipo === 'bien' ? 'cube-outline' : 'construct-outline'} size={14} color={item.tipo === 'bien' ? COLORES.primario : COLORES.morado} />
                  </View>
                  <View style={estilos.itemInfo}>
                    <Text style={estilos.itemNombre}>{item.nombre}</Text>
                    <Text style={estilos.itemMeta}>{item.cantidad} × {formatearMoneda(precio)}</Text>
                  </View>
                  <Text style={estilos.itemSubtotal}>{formatearMoneda(subtotal)}</Text>
                  <View style={estilosLocales.itemAcciones}>
                    <TouchableOpacity style={estilosLocales.itemAccionBtn} onPress={() => abrirEditarItem(item)} activeOpacity={0.8}>
                      <Ionicons name="pencil-outline" size={13} color={COLORES.primario} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[estilosLocales.itemAccionBtn, { backgroundColor: COLORES.peligroClaro }]} onPress={() => handleEliminarItem(item)} activeOpacity={0.8}>
                      <Ionicons name="trash-outline" size={13} color={COLORES.peligro} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          {(pedido.items ?? []).length > 0 && (
            <>
              {esVenta && montoIvaCliente > 0 && (
                <>
                  <View style={[estilos.totalFila, { borderBottomWidth: 0, paddingBottom: ESPACIADO.xs }]}>
                    <Text style={[estilos.totalEtiqueta, { color: COLORES.textoSecundario, fontWeight: FUENTE.pesoNormal }]}>Subtotal ítems</Text>
                    <Text style={[estilos.totalValor, { fontSize: FUENTE.tamanoBase }]}>{formatearMoneda(subtotalVentaItems)}</Text>
                  </View>
                  <View style={[estilos.totalFila, { borderBottomWidth: 0, paddingBottom: ESPACIADO.xs }]}>
                    <Text style={[estilos.totalEtiqueta, { color: COLORES.textoSecundario, fontWeight: FUENTE.pesoNormal }]}>IVA ({pedido.impuesto}%)</Text>
                    <Text style={[estilos.totalValor, { fontSize: FUENTE.tamanoBase }]}>{formatearMoneda(montoIvaCliente)}</Text>
                  </View>
                </>
              )}
              <View style={estilos.totalFila}>
                <Text style={estilos.totalEtiqueta}>
                  {esVenta && montoIvaCliente > 0 ? 'Total a cobrar' : mostrarTarjetaProveedorVentaSolo ? 'Total venta' : 'Total'}
                </Text>
                <Text style={estilos.totalValor}>{formatearMoneda(total)}</Text>
              </View>
            </>
          )}
        </View>

        <>
          {mostrarTarjetaProveedorVentaSolo ? (
            <View style={estilos.card}>
              <View style={estilos.cardHeader}>
                <Text style={estilos.cardTitulo}>Repartos recibidos</Text>
                <View style={estilos.cardCount}>
                  <Text style={estilos.cardCountTexto}>{pedido.pagos?.length ?? 0}</Text>
                </View>
              </View>
              <Text
                style={[
                  estilosLocales.proveedorSub,
                  { paddingHorizontal: ESPACIADO.md, marginBottom: ESPACIADO.sm, marginTop: -ESPACIADO.xs },
                ]}
                numberOfLines={2}
              >
                Pagos del proveedor desde tu margen. Sumalos con el botón verde del pie.
              </Text>
              {(pedido.pagos ?? []).length === 0 ? (
                <View style={estilos.sinDatosBox}>
                  <Ionicons name="receipt-outline" size={24} color={COLORES.textoDeshabilitado} />
                  <Text style={estilos.sinDatos}>Sin repartos aún</Text>
                </View>
              ) : (
                (pedido.pagos ?? []).map((pago, idx) => {
                  const esUltimo = idx === (pedido.pagos?.length ?? 0) - 1;
                  return (
                    <View key={pago.id} style={[estilos.pagoFila, esUltimo && { borderBottomWidth: 0 }]}>
                      <View style={estilos.pagoIconBox}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORES.exito} />
                      </View>
                      <Text style={estilos.pagoFecha}>{formatearFecha(pago.fecha)}</Text>
                      <Text style={[estilos.pagoMonto, { flex: 1 }]}>{formatearMoneda(pago.monto)}</Text>
                      <TouchableOpacity onPress={() => handleEliminarPago(pago.id, pago.monto)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={15} color={COLORES.peligro} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <View style={estilos.card}>
              <View style={estilos.cardHeader}>
                <Text style={estilos.cardTitulo}>Pagos registrados</Text>
                <View style={estilos.cardCount}>
                  <Text style={estilos.cardCountTexto}>{pedido.pagos?.length ?? 0}</Text>
                </View>
              </View>
              {(pedido.pagos ?? []).length === 0 ? (
                <View style={estilos.sinDatosBox}>
                  <Ionicons name="receipt-outline" size={24} color={COLORES.textoDeshabilitado} />
                  <Text style={estilos.sinDatos}>Sin pagos aún</Text>
                </View>
              ) : (
                (pedido.pagos ?? []).map((pago, idx) => {
                  const esUltimo = idx === (pedido.pagos?.length ?? 0) - 1;
                  return (
                    <View key={pago.id} style={[estilos.pagoFila, esUltimo && { borderBottomWidth: 0 }]}>
                      <View style={estilos.pagoIconBox}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORES.exito} />
                      </View>
                      <Text style={estilos.pagoFecha}>{formatearFecha(pago.fecha)}</Text>
                      <Text style={[estilos.pagoMonto, { flex: 1 }]}>{formatearMoneda(pago.monto)}</Text>
                      <TouchableOpacity onPress={() => handleEliminarPago(pago.id, pago.monto)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={15} color={COLORES.peligro} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {mostrarSeccionProveedorDetalle && (
            <View style={[estilos.card, estilosLocales.cardProveedor]}>
              <View style={estilos.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm }}>
                  <Ionicons name="business-outline" size={16} color={COLORES.proveedor} />
                  <Text style={[estilos.cardTitulo, { color: COLORES.proveedor }]}>Proveedor</Text>
                </View>
                <EstadoBadge estado={resumen?.estadoProveedor ?? 'pendiente'} />
              </View>

              <View style={estilosLocales.proveedorNombreBox}>
                <View style={[estilosLocales.proveedorAvatar, { backgroundColor: COLORES.proveedorClaro }]}>
                  <Text style={[estilosLocales.proveedorAvatarLetra, { color: COLORES.proveedor }]}>
                    {(pedido.proveedor?.nombre ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilosLocales.proveedorNombre}>{pedido.proveedor?.nombre ?? '—'}</Text>
                  <Text style={estilosLocales.proveedorSub}>
                    {estaProveedorPagado ? 'Pago completado' : `Saldo pendiente: ${formatearMoneda(saldoProveedor)}`}
                  </Text>
                </View>
              </View>

              {!estaProveedorPagado && totalCostoProveedor > 0 && (
                <View style={estilosLocales.progresoProveedorWrapper}>
                  <View style={estilos.progresoBar}>
                    <View style={[estilos.progresoFill, estilosLocales.progresoProveedorFill, { width: `${porcentajeProveedorPagado}%` as any }]} />
                  </View>
                  <Text style={estilosLocales.progresoProveedorTexto}>
                    {formatearMoneda(totalPagadoProveedor)} pagado · {porcentajeProveedorPagado}%
                  </Text>
                </View>
              )}

              <View style={estilosLocales.totalesProveedor}>
                <View style={estilosLocales.totalProveedorItem}>
                  <Text style={estilosLocales.totalProveedorLabel}>Costo total</Text>
                  <Text style={estilosLocales.totalProveedorValor}>{formatearMoneda(totalCostoProveedor)}</Text>
                </View>
                <View style={estilosLocales.totalProveedorItem}>
                  <Text style={estilosLocales.totalProveedorLabel}>Pagado</Text>
                  <Text style={[estilosLocales.totalProveedorValor, { color: COLORES.exito }]}>
                    {formatearMoneda(totalPagadoProveedor)}
                  </Text>
                </View>
                <View style={estilosLocales.totalProveedorItem}>
                  <Text style={estilosLocales.totalProveedorLabel}>Pendiente</Text>
                  <Text
                    style={[
                      estilosLocales.totalProveedorValor,
                      { color: estaProveedorPagado ? COLORES.exito : COLORES.proveedor },
                    ]}
                  >
                    {formatearMoneda(saldoProveedor)}
                  </Text>
                </View>
              </View>

              {(pedido.pagosProveedor ?? []).length > 0 && (
                <View style={estilosLocales.pagosProveedorLista}>
                  <Text style={estilosLocales.pagosProveedorTitulo}>Movimientos con el proveedor</Text>
                  {(pedido.pagosProveedor ?? []).map((pago, idx) => {
                    const esUltimo = idx === (pedido.pagosProveedor?.length ?? 0) - 1;
                    const esCobroMov = pago.tipo === 'cobro';
                    const esIngreso = pago.tipo === 'ingreso_cliente_a_proveedor';
                    return (
                      <View key={pago.id} style={[estilos.pagoFila, esUltimo && { borderBottomWidth: 0 }]}>
                        <View
                          style={[
                            estilos.pagoIconBox,
                            {
                              backgroundColor: esIngreso
                                ? COLORES.primarioClaro
                                : esCobroMov
                                  ? COLORES.exitoClaro
                                  : COLORES.proveedorClaro,
                            },
                          ]}
                        >
                          <Ionicons
                            name={esIngreso ? 'people-outline' : esCobroMov ? 'arrow-down-circle' : 'arrow-up-circle'}
                            size={16}
                            color={esIngreso ? COLORES.primario : esCobroMov ? COLORES.exito : COLORES.proveedor}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={estilos.pagoFecha}>{formatearFecha(pago.fecha)}</Text>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: FUENTE.pesoBold,
                              color: esIngreso ? COLORES.primario : esCobroMov ? COLORES.exito : COLORES.proveedor,
                            }}
                          >
                            {esIngreso ? 'Ingreso clientes (no costo)' : esCobroMov ? 'Cobro (te pagó)' : 'Pago (le pagaste)'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            estilos.pagoMonto,
                            {
                              color: esIngreso ? COLORES.primario : esCobroMov ? COLORES.exito : COLORES.proveedor,
                              marginRight: 4,
                            },
                          ]}
                        >
                          {formatearMoneda(pago.monto)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleEliminarPagoProveedor(pago.id, pago.monto, pago.tipo)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={COLORES.peligro} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {mostrarTarjetaProveedorVentaSolo ? (
                maxIngresoClienteProveedor > 0.005 ? (
                  <View style={estilosLocales.botonesProveedorFila}>
                    <TouchableOpacity
                      style={[estilosLocales.botonPagarProveedor, { width: '100%' }]}
                      onPress={() => abrirModalProveedor('ingreso_cliente_a_proveedor')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="person-add-outline" size={17} color={COLORES.blanco} />
                      <Text style={estilosLocales.botonPagarProveedorTexto}>
                        Cliente pagó al proveedor · {formatearMoneda(maxIngresoClienteProveedor)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : !estaProveedorPagado && saldoProveedor > 0.005 ? (
                  <View style={estilosLocales.botonesProveedorFila}>
                    <TouchableOpacity
                      style={[estilosLocales.botonPagarProveedor, { width: '100%' }]}
                      onPress={() => abrirModalProveedor('pago')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="arrow-up-circle-outline" size={17} color={COLORES.blanco} />
                      <Text style={estilosLocales.botonPagarProveedorTexto}>
                        Pagar · {formatearMoneda(saldoProveedor)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              ) : !estaProveedorPagado && saldoProveedor > 0.005 ? (
                <View style={estilosLocales.botonesProveedorFila}>
                  <TouchableOpacity
                    style={[estilosLocales.botonPagarProveedor, { width: '100%' }]}
                    onPress={() => abrirModalProveedor('pago')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={17} color={COLORES.blanco} />
                    <Text style={estilosLocales.botonPagarProveedorTexto}>
                      Pagar · {formatearMoneda(saldoProveedor)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </>

        {/* Mis utilidades: venta con proveedor (cliente en app o venta solo proveedor) */}
        {esVenta && (mostrarLadoProveedorCosto || mostrarTarjetaProveedorVentaSolo) && (
          <View style={estilosLocales.cardGanancia}>
            <View style={estilos.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm }}>
                <Ionicons name="trending-up-outline" size={16} color={COLORES.exito} />
                <Text style={[estilos.cardTitulo, { color: COLORES.exito }]}>Mis utilidades</Text>
              </View>
            </View>
            {mostrarTarjetaProveedorVentaSolo ? (
              <View style={estilosLocales.gananciaFila}>
                <View style={estilosLocales.gananciaItem}>
                  <Text style={estilosLocales.gananciaLabel}>Cliente→proveedor</Text>
                  <Text style={[estilosLocales.gananciaValor, { color: COLORES.primario }]}>
                    {formatearMoneda(totalIngresosClientesAlProveedor)}
                  </Text>
                  <Text style={estilosLocales.gananciaMini} numberOfLines={1}>
                    {total > 0.005 ? `/ ${formatearMoneda(total)}` : '—'}
                  </Text>
                </View>
                <View style={estilosLocales.gananciaItem}>
                  <Text style={estilosLocales.gananciaLabel}>Reparto</Text>
                  <Text style={[estilosLocales.gananciaValor, { color: COLORES.exito }]}>{formatearMoneda(totalPagado)}</Text>
                  <Text style={estilosLocales.gananciaMini} numberOfLines={1}>
                    {referenciaCobroCliente > 0.005 ? `/ ${formatearMoneda(referenciaCobroCliente)}` : '—'}
                  </Text>
                </View>
                <View style={[estilosLocales.gananciaItem, estilosLocales.gananciaResultadoBox]}>
                  <Text style={estilosLocales.gananciaLabel}>Utilidad real</Text>
                  <Text
                    style={[
                      estilosLocales.gananciaValor,
                      estilosLocales.gananciaResultado,
                      { color: utilidadRealProveedor >= 0 ? COLORES.exito : COLORES.peligro },
                    ]}
                  >
                    {formatearMoneda(utilidadRealProveedor)}
                  </Text>
                  <Text style={estilosLocales.gananciaMini} numberOfLines={2}>
                    {formatearMoneda(totalPagado)} reparto − {formatearMoneda(netoEgresoProveedor)} neto costo
                  </Text>
                  {abonosProveedor > 0.005 || cobrosProveedor > 0.005 ? (
                    <Text style={[estilosLocales.gananciaMini, { marginTop: 4 }]} numberOfLines={2}>
                      Abonaste {formatearMoneda(abonosProveedor)} · Te pagó {formatearMoneda(cobrosProveedor)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={estilosLocales.gananciaFila}>
                <View style={estilosLocales.gananciaItem}>
                  <Text style={estilosLocales.gananciaLabel}>Cobrado al cliente</Text>
                  <Text style={[estilosLocales.gananciaValor, { color: COLORES.primario }]}>{formatearMoneda(totalPagado)}</Text>
                </View>
                <Text style={estilosLocales.gananciaMenos}>−</Text>
                <View style={estilosLocales.gananciaItem}>
                  <Text style={estilosLocales.gananciaLabel}>Neto proveedor</Text>
                  <Text style={[estilosLocales.gananciaValor, { color: COLORES.proveedor }]}>{formatearMoneda(netoEgresoProveedor)}</Text>
                  {abonosProveedor > 0.005 || cobrosProveedor > 0.005 ? (
                    <Text style={estilosLocales.gananciaMini} numberOfLines={2}>
                      Abonaste {formatearMoneda(abonosProveedor)} · Te pagó {formatearMoneda(cobrosProveedor)}
                    </Text>
                  ) : null}
                </View>
                <Text style={estilosLocales.gananciaIgual}>=</Text>
                <View style={[estilosLocales.gananciaItem, estilosLocales.gananciaResultadoBox]}>
                  <Text style={estilosLocales.gananciaLabel}>Utilidad real</Text>
                  <Text style={[estilosLocales.gananciaValor, estilosLocales.gananciaResultado, { color: utilidadRealProveedor >= 0 ? COLORES.exito : COLORES.peligro }]}>
                    {formatearMoneda(utilidadRealProveedor)}
                  </Text>
                </View>
              </View>
            )}
            {(pedido.impuesto ?? 0) > 0 && (
              <View style={estilosLocales.gananciaIvaFila}>
                <Ionicons name="pricetag-outline" size={15} color={COLORES.morado} />
                <Text style={estilosLocales.gananciaIvaTexto}>
                  IVA del pedido ({pedido.impuesto}%): {formatearMoneda(montoIvaCliente)}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={estilos.botonEliminar} onPress={handleEliminar} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={18} color={COLORES.peligro} />
          <Text style={estilos.botonEliminarTexto}>Eliminar pedido</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={estilos.footer}>
        {!estaPagado ? (
          <TouchableOpacity style={estilos.botonPagarHero} onPress={() => setModalPago(true)} activeOpacity={0.85}>
            <Ionicons name="cash-outline" size={20} color={COLORES.blanco} />
            <Text style={estilos.botonPagarHeroTexto}>
              {sinClienteVenta && tieneProveedor ? 'Registrar reparto · ' : 'Registrar pago · '}
              {formatearMoneda(saldo)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={estilos.pagadoBox}>
            <Ionicons name="checkmark-circle" size={18} color={COLORES.exito} />
            <Text style={estilos.pagadoTexto}>
              {sinClienteVenta && tieneProveedor ? 'Total repartido (venta con proveedor)' : 'Pedido completamente pagado'}
            </Text>
          </View>
        )}
        <TouchableOpacity style={estilos.botonPDF} onPress={() => setModalPDF(true)} activeOpacity={0.85} disabled={generandoPDF}>
          {generandoPDF ? (
            <ActivityIndicator color={COLORES.primario} size="small" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color={COLORES.primario} />
              <Text style={estilos.botonPDFTexto}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal: nombre e impuesto del pedido */}
      <Modal visible={modalMeta} animationType="slide" transparent onRequestClose={() => setModalMeta(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalContenido}>
              <View style={estilos.modalHandle} />
              <Text style={estilos.modalTitulo}>Datos del pedido</Text>
              <Text style={[estilos.modalSubtitulo, { marginBottom: ESPACIADO.md }]}>
                Aparecen en listas y en los PDF (cliente, proveedor, completo y cotización).
              </Text>
              <CampoTexto
                etiqueta="Nombre o referencia"
                placeholder="Ej: Pedido Hotel Mar · Cotización abril"
                value={metaNombre}
                onChangeText={setMetaNombre}
                maxLength={200}
                icono="pricetag-outline"
                ayuda="Opcional. Si lo dejás vacío solo se muestra el número de pedido."
              />
              <CampoTexto
                etiqueta="% de impuesto (IVA u otro)"
                placeholder="Vacío = sin IVA sobre el subtotal"
                value={metaImpuesto}
                onChangeText={setMetaImpuesto}
                keyboardType="decimal-pad"
                icono="calculator-outline"
                ayuda="En ventas: se suma al subtotal de ítems para el total a cobrar, saldo y PDFs (cliente y completo). Sin impuesto en PDF solo proveedor."
              />
              <View style={estilos.modalBotones}>
                <BotonPrimario titulo="Cancelar" onPress={() => setModalMeta(false)} variante="secundario" estilo={{ flex: 1, marginRight: ESPACIADO.sm }} />
                <BotonPrimario titulo="Guardar" onPress={handleGuardarMeta} cargando={guardandoMeta} estilo={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: seleccionar tipo de PDF */}
      <Modal visible={modalPDF} animationType="slide" transparent onRequestClose={() => setModalPDF(false)}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContenido}>
            <View style={estilos.modalHandle} />
            <Text style={[estilos.modalTitulo, { marginBottom: ESPACIADO.md }]}>Generar PDF</Text>

            <TouchableOpacity style={estilosLocales.pdfOpcion} onPress={() => handleGenerarPDF('cliente')} activeOpacity={0.85}>
              <View style={[estilosLocales.pdfIconBox, { backgroundColor: COLORES.primarioClaro }]}>
                <Ionicons name="person-outline" size={20} color={COLORES.primario} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilosLocales.pdfOpcionTitulo}>PDF Cliente</Text>
                <Text style={estilosLocales.pdfOpcionDesc}>Ítems con precio de venta · pagos recibidos · saldo pendiente</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
            </TouchableOpacity>

            {mostrarLadoProveedorCosto || mostrarTarjetaProveedorVentaSolo ? (
              <TouchableOpacity style={estilosLocales.pdfOpcion} onPress={() => handleGenerarPDF('proveedor')} activeOpacity={0.85}>
                <View style={[estilosLocales.pdfIconBox, { backgroundColor: COLORES.proveedorClaro }]}>
                  <Ionicons name="business-outline" size={20} color={COLORES.proveedor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilosLocales.pdfOpcionTitulo}>PDF Proveedor</Text>
                  <Text style={estilosLocales.pdfOpcionDesc}>Ítems con precio de costo · pagos realizados · saldo pendiente</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            ) : null}

            {mostrarLadoProveedorCosto || mostrarTarjetaProveedorVentaSolo ? (
              <TouchableOpacity style={estilosLocales.pdfOpcion} onPress={() => handleGenerarPDF('completo')} activeOpacity={0.85}>
                <View style={[estilosLocales.pdfIconBox, { backgroundColor: COLORES.exitoClaro }]}>
                  <Ionicons name="stats-chart-outline" size={20} color={COLORES.exito} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilosLocales.pdfOpcionTitulo}>PDF Completo</Text>
                  <Text style={estilosLocales.pdfOpcionDesc}>Resumen triangulado: cliente + proveedor + utilidades</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={estilosLocales.pdfOpcion} onPress={() => handleGenerarPDF('cotizacion')} activeOpacity={0.85}>
              <View style={[estilosLocales.pdfIconBox, { backgroundColor: COLORES.advertenciaClaro }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORES.advertencia} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilosLocales.pdfOpcionTitulo}>PDF Cotización</Text>
                <Text style={estilosLocales.pdfOpcionDesc}>Formato profesional con logo, impuesto y datos de empresa</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
            </TouchableOpacity>

            <TouchableOpacity style={[estilosLocales.pdfOpcion, { marginTop: ESPACIADO.sm, borderColor: COLORES.borde }]} onPress={() => setModalPDF(false)} activeOpacity={0.85}>
              <Text style={{ textAlign: 'center', flex: 1, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoSemibold }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: registrar pago */}
      <Modal visible={modalPago} animationType="slide" transparent onRequestClose={() => { setModalPago(false); setMontoPago(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalContenido}>
              <View style={estilos.modalHandle} />
              <View style={estilos.modalHeader}>
                <View style={estilos.modalIconBox}>
                  <Ionicons name="cash-outline" size={22} color={COLORES.exito} />
                </View>
                <View>
                  <Text style={estilos.modalTitulo}>{sinClienteVenta && tieneProveedor ? 'Registrar reparto' : 'Registrar pago'}</Text>
                  <Text style={estilos.modalSubtitulo}>
                    {sinClienteVenta && tieneProveedor
                      ? `Te falta recibir de tu margen: ${formatearMoneda(saldo)} (margen del pedido: ${formatearMoneda(referenciaCobroCliente)}).`
                      : `Saldo pendiente: ${formatearMoneda(saldo)}`}
                  </Text>
                </View>
              </View>
              <CampoTexto
                etiqueta={sinClienteVenta && tieneProveedor ? 'Monto del reparto' : 'Monto a pagar'}
                placeholder="0.00"
                value={montoPago}
                onChangeText={setMontoPago}
                keyboardType="decimal-pad"
                icono="cash-outline"
                autoFocus
                ayuda={
                  sinClienteVenta && tieneProveedor
                    ? `Máximo este reparto: ${formatearMoneda(saldo)} (la suma de repartos no puede superar el margen).`
                    : `Máximo: ${formatearMoneda(saldo)}`
                }
              />
              <View style={estilos.modalBotones}>
                <BotonPrimario titulo="Cancelar" onPress={() => { setModalPago(false); setMontoPago(''); }} variante="secundario" estilo={{ flex: 1, marginRight: ESPACIADO.sm }} />
                <BotonPrimario titulo="Guardar" onPress={handleAgregarPago} cargando={guardandoPago} estilo={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: pago o cobro al proveedor */}
      <Modal visible={modalPagoProveedor} animationType="slide" transparent onRequestClose={cerrarModalProveedor}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalContenido}>
              <View style={estilos.modalHandle} />
              <View style={estilos.modalHeader}>
                <View
                  style={[
                    estilos.modalIconBox,
                    {
                      backgroundColor:
                        tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                          ? COLORES.primarioClaro
                          : tipoMovimientoProveedor === 'cobro'
                            ? COLORES.exitoClaro
                            : COLORES.proveedorClaro,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                        ? 'people-outline'
                        : tipoMovimientoProveedor === 'cobro'
                          ? 'arrow-down-circle-outline'
                          : 'business-outline'
                    }
                    size={22}
                    color={
                      tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                        ? COLORES.primario
                        : tipoMovimientoProveedor === 'cobro'
                          ? COLORES.exito
                          : COLORES.proveedor
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.modalTitulo}>
                    {tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                      ? 'Ingreso de clientes al proveedor'
                      : tipoMovimientoProveedor === 'cobro'
                        ? 'Cobro del proveedor (costo)'
                        : 'Pago al proveedor'}
                  </Text>
                  <Text style={estilos.modalSubtitulo}>
                    {tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                      ? `Anotá lo que clientes finales le pagaron al proveedor. La suma no puede superar el total de venta (máximo ahora ${formatearMoneda(maxIngresoClienteProveedor)}). Lo que él te reparta lo registrás con el botón verde del pie.`
                      : tipoMovimientoProveedor === 'cobro'
                        ? `Saldo pendiente de costo: ${formatearMoneda(saldoProveedor)}. Registrá lo que te transfirió o entregó.`
                        : `Saldo a pagar: ${formatearMoneda(saldoProveedor)}`}
                  </Text>
                </View>
              </View>
              <CampoTexto
                etiqueta={
                  tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                    ? 'Monto que le pagaron (clientes finales)'
                    : tipoMovimientoProveedor === 'cobro'
                      ? 'Monto que te pagó el proveedor'
                      : 'Monto a pagar'
                }
                placeholder="0.00"
                value={montoPagoProveedor}
                onChangeText={setMontoPagoProveedor}
                keyboardType="decimal-pad"
                icono="cash-outline"
                autoFocus
                ayuda={
                  tipoMovimientoProveedor === 'ingreso_cliente_a_proveedor'
                    ? `Tope para este movimiento: ${formatearMoneda(maxIngresoClienteProveedor)} (referencia de flujo hacia el proveedor).`
                    : tipoMovimientoProveedor === 'cobro'
                      ? 'Reduce lo que le debés por el costo del pedido.'
                      : `Máximo: ${formatearMoneda(saldoProveedor)}`
                }
              />
              <View style={estilos.modalBotones}>
                <BotonPrimario titulo="Cancelar" onPress={cerrarModalProveedor} variante="secundario" estilo={{ flex: 1, marginRight: ESPACIADO.sm }} />
                <BotonPrimario titulo="Guardar" onPress={handleAgregarPagoProveedor} cargando={guardandoPagoProveedor} estilo={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: agregar/editar ítem */}
      <Modal visible={modalItem} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilosLocales.modalItemHeader}>
            <Text style={estilos.modalTitulo}>{itemEditable.itemId ? 'Editar ítem' : 'Nuevo ítem'}</Text>
            <View style={{ flexDirection: 'row', gap: ESPACIADO.sm }}>
              {productos.length > 0 && !itemEditable.itemId && (
                <TouchableOpacity style={estilosLocales.btnCatalogo} onPress={() => setModalCatalogo(true)} activeOpacity={0.8}>
                  <Ionicons name="grid-outline" size={14} color={COLORES.primario} />
                  <Text style={estilosLocales.btnCatalogoTexto}>Catálogo</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setModalItem(false)} style={estilosLocales.cerrarBtn}>
                <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={{ padding: ESPACIADO.md, paddingBottom: ESPACIADO.md + SCROLL_FORM_PADDING_BOTTOM }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <CampoTexto etiqueta="Nombre" placeholder="Nombre del ítem" value={itemEditable.nombre} onChangeText={(v) => setItemEditable((p) => ({ ...p, nombre: v }))} autoFocus maxLength={150} />
              <View style={{ flexDirection: 'row' }}>
                <CampoTexto etiqueta="Cantidad" placeholder="1" value={itemEditable.cantidad} onChangeText={(v) => setItemEditable((p) => ({ ...p, cantidad: v }))} keyboardType="decimal-pad" contenedor={{ flex: 1, marginRight: ESPACIADO.sm }} />
                <CampoTexto etiqueta="Precio costo" placeholder="0.00" value={itemEditable.precioCompra} onChangeText={(v) => setItemEditable((p) => ({ ...p, precioCompra: v }))} keyboardType="decimal-pad" contenedor={{ flex: 1, marginLeft: ESPACIADO.sm }} />
              </View>
              <CampoTexto etiqueta="Precio venta" placeholder="0.00" value={itemEditable.precioVenta} onChangeText={(v) => setItemEditable((p) => ({ ...p, precioVenta: v }))} keyboardType="decimal-pad" />
            </ScrollView>
            <View style={estilosLocales.modalItemFooter}>
              <BotonPrimario titulo={itemEditable.itemId ? 'Actualizar ítem' : 'Agregar ítem'} onPress={handleGuardarItem} cargando={guardandoItem} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Modal: catálogo para ítems */}
      <Modal visible={modalCatalogo} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilosLocales.modalItemHeader}>
            <Text style={estilos.modalTitulo}>Catálogo</Text>
            <TouchableOpacity onPress={() => setModalCatalogo(false)} style={estilosLocales.cerrarBtn}>
              <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={productos}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: ESPACIADO.md }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORES.borde }} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.md, paddingVertical: ESPACIADO.md }} onPress={() => seleccionarProductoCatalogo(item)} activeOpacity={0.85}>
                <View style={[estilosLocales.iconBox, { backgroundColor: item.tipo === 'bien' ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                  <Ionicons name={item.tipo === 'bien' ? 'cube-outline' : 'construct-outline'} size={16} color={item.tipo === 'bien' ? COLORES.primario : COLORES.morado} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: FUENTE.pesoSemibold, color: COLORES.texto }}>{item.nombre}</Text>
                  <Text style={{ fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario }}>Venta: {formatearMoneda(item.precioEmpresa)}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={COLORES.primario} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const estilosLocales = StyleSheet.create({
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginHorizontal: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  metaLabel: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValor: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto, marginTop: 2 },
  metaEditBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAgregarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.sm,
    paddingVertical: 4,
    paddingHorizontal: ESPACIADO.sm,
  },
  btnAgregarItemTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.primario },
  itemAcciones: { flexDirection: 'row', gap: 6, marginLeft: ESPACIADO.sm },
  itemAccionBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIO.sm,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ESPACIADO.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
  },
  modalItemFooter: {
    padding: ESPACIADO.md,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    backgroundColor: COLORES.fondo,
  },
  cerrarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCatalogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.lg,
    paddingVertical: 6,
    paddingHorizontal: ESPACIADO.sm,
  },
  btnCatalogoTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.primario },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Ganancia ──────────────────────────────────────────────────────────────
  cardGanancia: {
    backgroundColor: COLORES.exitoClaro,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginHorizontal: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1.5,
    borderColor: COLORES.exito,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  gananciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: ESPACIADO.sm,
  },
  gananciaItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  gananciaLabel: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginBottom: 2, textAlign: 'center' },
  gananciaValor: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, textAlign: 'center' },
  gananciaMenos: { fontSize: 18, color: COLORES.textoSecundario, paddingHorizontal: 4 },
  gananciaIgual: { fontSize: 18, color: COLORES.textoSecundario, paddingHorizontal: 4 },
  gananciaResultadoBox: { backgroundColor: COLORES.tarjeta, borderRadius: RADIO.md, padding: ESPACIADO.sm },
  gananciaResultado: { fontSize: FUENTE.tamanoBase },
  gananciaMini: { fontSize: 10, color: COLORES.textoSecundario, marginTop: 4, textAlign: 'center', lineHeight: 14 },
  gananciaIvaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    marginTop: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.md,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.md,
  },
  gananciaIvaTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.morado,
    textAlign: 'center',
    flexShrink: 1,
  },
  // ─── PDF opciones ──────────────────────────────────────────────────────────
  pdfOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  pdfIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfOpcionTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 2 },
  pdfOpcionDesc: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, lineHeight: 16 },
  // ─── Proveedor / control venta solo proveedor (compacto) ───────────────────
  margenCabeceraPlegable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ESPACIADO.md,
    paddingVertical: ESPACIADO.sm,
    gap: ESPACIADO.sm,
  },
  margenResumenCompacto: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    marginTop: 4,
  },
  margenResumenCompactoSec: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 2,
  },
  margenAccionesFila: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.md,
    paddingBottom: ESPACIADO.md,
  },
  margenBotonSec: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.primario,
    backgroundColor: COLORES.tarjeta,
  },
  margenBotonSecTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.primario,
  },
  margenBotonPri: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: RADIO.lg,
    backgroundColor: COLORES.primario,
  },
  margenBotonPriTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
  },
  margenDetalleSep: {
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    paddingTop: ESPACIADO.md,
    marginTop: ESPACIADO.sm,
  },
  cardProveedor: {
    borderColor: COLORES.proveedorClaro,
    borderWidth: 1.5,
  },
  proveedorNombreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    paddingVertical: ESPACIADO.sm,
    marginBottom: ESPACIADO.sm,
  },
  proveedorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proveedorAvatarLetra: {
    fontWeight: FUENTE.pesoBold,
    fontSize: FUENTE.tamanoBase,
  },
  proveedorNombre: {
    fontWeight: FUENTE.pesoBold,
    fontSize: FUENTE.tamanoBase,
    color: COLORES.texto,
  },
  proveedorSub: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    marginTop: 2,
  },
  progresoProveedorWrapper: {
    marginBottom: ESPACIADO.md,
  },
  progresoProveedorFill: {
    backgroundColor: COLORES.proveedor,
  },
  progresoProveedorTexto: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.proveedor,
    marginTop: 4,
    fontWeight: FUENTE.pesoMedio,
  },
  totalesProveedor: {
    flexDirection: 'row',
    backgroundColor: COLORES.proveedorClaro,
    borderRadius: RADIO.md,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
    gap: ESPACIADO.sm,
  },
  totalProveedorItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalProveedorLabel: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginBottom: 2,
  },
  totalProveedorValor: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  pagosProveedorLista: {
    marginBottom: ESPACIADO.md,
  },
  pagosProveedorTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  botonesProveedorFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACIADO.sm,
    marginTop: ESPACIADO.sm,
  },
  botonPagarProveedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.proveedor,
    borderRadius: RADIO.xl,
    paddingVertical: 12,
  },
  botonPagarProveedorTexto: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
  },
  botonCobrarProveedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: COLORES.exito,
  },
  botonCobrarProveedorTexto: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.exito,
  },
  botonIngresoProveedorLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
  },
  botonIngresoProveedorLinkTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.primario,
  },
});

export default DetallePedido;
