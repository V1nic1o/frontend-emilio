import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PersonasStackParamList } from '../../navegacion/tipos';
import { usePersonaDetalle, usePersonas } from '../../hooks/usePersonas';
import { usePedidos } from '../../hooks/usePedidos';
import { useAsesoriaPersona } from '../../hooks/useAsesorias';
import { useWallet } from '../../contexto/WalletContext';
import { Pedido, PedidoComoProveedor, TipoPersona } from '../../tipos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import EstadoBadge from '../../componentes/EstadoBadge';
import FAB from '../../componentes/FAB';
import IndicadorWorkspaceHeader from '../../componentes/IndicadorWorkspaceHeader';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { formatearMoneda, formatearFecha, etiquetaPedido, subtituloNumeroPedido } from '../../utilidades/formato';
import { mostrarAlerta, confirmarYEntonces } from '../../utilidades/alertaPlataforma';
import { lineaSaldoPedidoComoProveedor } from '../../utilidades/saldoPedidoComoProveedor';

type Props = NativeStackScreenProps<PersonasStackParamList, 'DetallePersona'>;

/** Aclaración mínima en UI de proveedor + intermediación: el pendiente es cobro al cliente del pedido. */
const AYUDA_POR_COBRAR_AL_CLIENTE = 'al cliente';

const DetallePersona: React.FC<Props> = ({ navigation, route }) => {
  const { personaId } = route.params;
  const { width: anchoVentana } = useWindowDimensions();
  const resumenCompacto = anchoVentana < 420;
  const { walletSeleccionado } = useWallet();
  const { persona, cargando: cargandoPersona, error, cargar: cargarPersona } = usePersonaDetalle(personaId);
  const { actualizar, eliminar } = usePersonas();
  const { pedidos, cargando: cargandoPedidos, cargar: cargarPedidos } = usePedidos();
  const { data: asesoriaResp, cargar: cargarAsesoria } = useAsesoriaPersona(personaId);

  const cargando = cargandoPersona || cargandoPedidos;

  const [modalEditar, setModalEditar] = useState(false);
  const [nombreEditable, setNombreEditable] = useState('');
  const [tipoEditable, setTipoEditable] = useState<TipoPersona>('cliente');
  const [direccionEditable, setDireccionEditable] = useState('');
  const [emailEditable, setEmailEditable] = useState('');
  const [telefonoEditable, setTelefonoEditable] = useState('');
  const [nitEditable, setNitEditable] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // cargar = usado solo por el RefreshControl (pull-to-refresh)
  const cargar = useCallback(() => {
    cargarPersona();
    cargarPedidos();
    cargarAsesoria();
  }, [cargarPersona, cargarPedidos, cargarAsesoria]);

  const abrirEditar = useCallback(() => {
    if (!persona) return;
    setNombreEditable(persona.nombre);
    setTipoEditable(persona.tipo);
    setDireccionEditable(persona.direccion ?? '');
    setEmailEditable(persona.email ?? '');
    setTelefonoEditable(persona.telefono ?? '');
    setNitEditable(persona.nit ?? '');
    setModalEditar(true);
  }, [persona]);

  // Refresca persona y pedidos al montar y al volver (p. ej. desde DetallePedido o otra pestaña)
  useFocusEffect(
    useCallback(() => {
      cargarPersona();
      cargarPedidos();
      cargarAsesoria();
    }, [cargarPersona, cargarPedidos, cargarAsesoria]),
  );

  useEffect(() => {
    if (!persona) return;
    navigation.setOptions({
      title: persona.nombre,
      headerRight: () => <IndicadorWorkspaceHeader compacto />,
    });
  }, [persona, navigation]);

  const handleGuardarEdicion = async () => {
    if (!nombreEditable.trim()) {
      mostrarAlerta('Nombre requerido', 'El nombre no puede estar vacío');
      return;
    }
    setGuardandoEdicion(true);
    try {
      await actualizar(personaId, {
        nombre: nombreEditable.trim(),
        tipo: tipoEditable,
        nit: nitEditable.trim(),
        direccion: direccionEditable.trim() || undefined,
        email: emailEditable.trim() || undefined,
        telefono: telefonoEditable.trim() || undefined,
      });
      setModalEditar(false);
      cargarPersona();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminar = () => {
    confirmarYEntonces(
      'Eliminar persona',
      `¿Eliminar a "${persona?.nombre}"? Se eliminarán también todos sus pedidos. Esta acción no se puede deshacer.`,
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await eliminar(personaId);
          navigation.goBack();
        } catch (e: unknown) {
          mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
        }
      },
    );
  };

  // Pedidos propios de esta persona
  const pedidosPersona = pedidos.filter((p) => p.personaId === personaId);
  // Pedidos de venta donde actúa como proveedor (vienen del backend en persona.pedidosProveedor)
  const pedidosComoProveedor: PedidoComoProveedor[] = persona?.pedidosProveedor ?? [];

  const renderPedido = useCallback(
    ({ item }: { item: Pedido }) => {
      const esVenta = item.tipo === 'venta';
      const resumen = item.resumen;
      const esCliente = persona?.tipo === 'cliente';
      const total = esCliente ? (resumen?.totalVenta ?? 0) : (resumen?.totalCompra ?? 0);
      const saldo = resumen ? Math.max(0, total - (resumen.totalPagado ?? 0)) : 0;
      const subNum = subtituloNumeroPedido(item);
      const metaLine = [subNum?.trim(), formatearFecha(item.fecha)].filter(Boolean).join(' · ');

      return (
        <TouchableOpacity
          style={[estilos.itemPedido, resumenCompacto && estilosLocales.itemPedidoWrap]}
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
          <View style={[estilos.pedidoCuerpo, { minWidth: 0 }]}>
            <Text style={estilos.pedidoTipo} numberOfLines={2}>
              {etiquetaPedido(item)}
            </Text>
            <View style={estilos.pedidoFilaMonto}>
              <View style={estilos.pedidoFilaMontoIzq}>
                {resumen ? (
                  <View style={{ flexShrink: 0 }}>
                    <EstadoBadge estado={resumen.estado} />
                  </View>
                ) : null}
              </View>
              <View style={estilos.pedidoColumnaMontos}>
                <Text
                  style={estilos.pedidoTotal}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {formatearMoneda(total)}
                </Text>
                {saldo > 0 ? (
                  <Text
                    style={estilos.pedidoSaldo}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    Debe {formatearMoneda(saldo)}
                  </Text>
                ) : null}
              </View>
            </View>
            {metaLine ? (
              <Text style={estilos.pedidoMeta} numberOfLines={1}>
                {metaLine}
              </Text>
            ) : null}
          </View>
          <View style={estilos.pedidoChevronWrap}>
            <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, persona, resumenCompacto]
  );

  const renderPedidoComoProveedor = useCallback(
    ({ item }: { item: PedidoComoProveedor }) => {
      const linea = lineaSaldoPedidoComoProveedor(item);
      const totalMostrar = linea.totalMostrar;
      const saldo = linea.saldo;
      const estaPagado = linea.estaPagado;
      const subNum = subtituloNumeroPedido(item);
      return (
        <TouchableOpacity
          style={[estilos.itemPedido, estilosLocales.itemProveedor, resumenCompacto && estilosLocales.itemPedidoWrap]}
          onPress={() => navigation.navigate('DetallePedido', { pedidoId: item.id })}
          activeOpacity={0.85}
        >
          <View style={[estilos.tipoIconBox, { backgroundColor: COLORES.proveedorClaro }]}>
            <Ionicons name="business-outline" size={20} color={COLORES.proveedor} />
          </View>
          <View style={[estilos.pedidoCuerpo, { minWidth: 0 }]}>
            <Text style={[estilos.pedidoTipo, { color: COLORES.proveedor }]} numberOfLines={2}>
              {etiquetaPedido(item)}
            </Text>
            <View style={estilos.pedidoFilaMonto}>
              <View style={estilos.pedidoFilaMontoIzq}>
                {!estaPagado ? <View style={estilosLocales.puntoPendienteLista} /> : null}
              </View>
              <View style={estilos.pedidoColumnaMontos}>
                <Text style={[estilos.pedidoTotal, { color: COLORES.proveedor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatearMoneda(totalMostrar)}
                </Text>
                {saldo > 0.005 ? (
                  linea.variante === 'intermediacion' ? (
                    <View style={estilosLocales.pedidoSaldoInterFila}>
                      <Text style={estilos.pedidoSaldo}>Por cobrar</Text>
                      <Text style={estilosLocales.pedidoSaldoMicroAyuda}>{AYUDA_POR_COBRAR_AL_CLIENTE}</Text>
                      <Text style={estilos.pedidoSaldo}>{formatearMoneda(saldo)}</Text>
                    </View>
                  ) : (
                    <Text style={estilos.pedidoSaldo} numberOfLines={2}>
                      {linea.variante === 'legado_sin_cliente'
                        ? 'Pendiente'
                        : linea.variante === 'costo_venta_cliente'
                          ? 'Le debés'
                          : 'Pendiente'}{' '}
                      {formatearMoneda(saldo)}
                    </Text>
                  )
                ) : (
                  <Text style={[estilos.pedidoSaldo, { color: COLORES.exito }]}>Al día</Text>
                )}
              </View>
            </View>
            <Text style={estilos.pedidoMeta} numberOfLines={2}>
              Cliente: {item.persona?.nombre?.trim() ? item.persona.nombre : 'Sin cliente'}
              {subNum ? ` · ${subNum}` : ''}
              {` · ${formatearFecha(item.fecha)}`}
            </Text>
          </View>
          <View style={estilos.pedidoChevronWrap}>
            <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, resumenCompacto]
  );

  if (cargando && !persona) return <CargandoSpinner />;
  if (error) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;
  if (!persona) return null;

  const esCliente = persona.tipo === 'cliente';
  const cobrosAsesoria = asesoriaResp?.suscripcion?.cobros ?? [];
  const pendienteAsesoriaMonto = cobrosAsesoria
    .filter((c) => c.estado === 'pendiente')
    .reduce((acc, c) => acc + c.montoTotal, 0);

  // Saldo pendiente de sus pedidos propios
  const totalSaldo = pedidosPersona.reduce((acc, p) => {
    const total = esCliente ? (p.resumen?.totalVenta ?? 0) : (p.resumen?.totalCompra ?? 0);
    return acc + Math.max(0, total - (p.resumen?.totalPagado ?? 0));
  }, 0);
  const saldoCostoConProveedor = persona.saldoCostoPendienteConProveedor ?? 0;
  const saldoVentasPorCobrarConProveedor = persona.saldoVentaPorCobrarComoProveedor ?? 0;
  const saldoPorCobrarClienteAProveedor = persona.saldoPorCobrarClienteAProveedor ?? 0;

  const tieneLegadoProveedor = pedidosComoProveedor.some(
    (p) =>
      p.tipo === 'venta' &&
      (p.personaId == null || p.personaId === undefined) &&
      p.esIntermediacion !== true,
  );
  const tieneInterProveedor = pedidosComoProveedor.some((p) => p.esIntermediacion === true);
  const tieneCostoClienteProveedor = pedidosComoProveedor.some(
    (p) =>
      p.tipo === 'venta' &&
      p.personaId != null &&
      p.personaId !== undefined &&
      p.esIntermediacion !== true,
  );

  type FilaResumen = { key: string; label: string; valorNum: number; color: string; subtitulo?: string };
  const filasResumenFinanzas: FilaResumen[] = [];
  if (pedidosPersona.length > 0) {
    filasResumenFinanzas.push({
      key: 'propio',
      label: esCliente ? 'Por cobrar' : 'Por pagar',
      valorNum: totalSaldo,
      color: totalSaldo > 0.005 ? COLORES.peligro : COLORES.exito,
    });
  }
  if (pedidosComoProveedor.length > 0) {
    if (tieneLegadoProveedor || saldoVentasPorCobrarConProveedor > 0.005) {
      filasResumenFinanzas.push({
        key: 'proveedor_legado',
        label: 'Pendiente sin cliente',
        valorNum: saldoVentasPorCobrarConProveedor,
        color: saldoVentasPorCobrarConProveedor > 0.005 ? COLORES.primario : COLORES.exito,
      });
    }
    if (tieneInterProveedor || saldoPorCobrarClienteAProveedor > 0.005) {
      filasResumenFinanzas.push({
        key: 'proveedor_cliente_a_prov',
        label: 'Por cobrar',
        subtitulo: AYUDA_POR_COBRAR_AL_CLIENTE,
        valorNum: saldoPorCobrarClienteAProveedor,
        color: saldoPorCobrarClienteAProveedor > 0.005 ? COLORES.peligro : COLORES.textoSecundario,
      });
    }
    if (tieneCostoClienteProveedor || saldoCostoConProveedor > 0.005) {
      filasResumenFinanzas.push({
        key: 'proveedor_costo',
        label: 'Le debés al proveedor',
        valorNum: saldoCostoConProveedor,
        color: saldoCostoConProveedor > 0.005 ? COLORES.advertencia : COLORES.exito,
      });
    }
  }
  if (esCliente && pendienteAsesoriaMonto > 0.005) {
    filasResumenFinanzas.push({
      key: 'asesoria',
      label: 'Asesoría por cobrar',
      valorNum: pendienteAsesoriaMonto,
      color: COLORES.pagado,
    });
  }

  const totalPedidosCount = pedidosPersona.length + pedidosComoProveedor.length;
  const hayPedidos = totalPedidosCount > 0;
  const mostrarTarjetaResumen = filasResumenFinanzas.length > 0 || hayPedidos;

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

              {/* Datos de contacto */}
              {(persona.direccion || persona.email || persona.telefono || persona.nit) && (
                <View style={estilosLocales.contactoBox}>
                  {persona.nit && (
                    <View style={estilosLocales.contactoFila}>
                      <Ionicons name="card-outline" size={13} color={COLORES.textoSecundario} />
                      <Text style={estilosLocales.contactoTexto}>NIT: {persona.nit}</Text>
                    </View>
                  )}
                  {persona.direccion && (
                    <View style={estilosLocales.contactoFila}>
                      <Ionicons name="location-outline" size={13} color={COLORES.textoSecundario} />
                      <Text style={estilosLocales.contactoTexto}>{persona.direccion}</Text>
                    </View>
                  )}
                  {persona.email && (
                    <View style={estilosLocales.contactoFila}>
                      <Ionicons name="mail-outline" size={13} color={COLORES.textoSecundario} />
                      <Text style={estilosLocales.contactoTexto}>{persona.email}</Text>
                    </View>
                  )}
                  {persona.telefono && (
                    <View style={estilosLocales.contactoFila}>
                      <Ionicons name="call-outline" size={13} color={COLORES.textoSecundario} />
                      <Text style={estilosLocales.contactoTexto}>{persona.telefono}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Acciones rápidas */}
              <View style={estilosLocales.accionesRow}>
                <TouchableOpacity style={estilosLocales.btnAccion} onPress={abrirEditar} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={15} color={COLORES.primario} />
                  <Text style={[estilosLocales.btnAccionTexto, { color: COLORES.primario }]}>Editar</Text>
                </TouchableOpacity>
                <View style={estilosLocales.accionesDivisor} />
                <TouchableOpacity style={estilosLocales.btnAccion} onPress={handleEliminar} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={15} color={COLORES.peligro} />
                  <Text style={[estilosLocales.btnAccionTexto, { color: COLORES.peligro }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Resumen financiero (filas apiladas; ancho completo en pantallas angostas) */}
            {mostrarTarjetaResumen && (
              <View style={estilos.resumenCard}>
                {filasResumenFinanzas.map((fila, idx) => (
                  <View
                    key={fila.key}
                    style={[
                      estilos.resumenRow,
                      idx > 0 && estilos.resumenRowBorder,
                      resumenCompacto && estilos.resumenRowCompact,
                    ]}
                  >
                    <View style={estilos.resumenLabelColumna}>
                      {fila.subtitulo ? (
                        <View style={estilosLocales.resumenEtiquetaFila}>
                          <Text
                            style={[estilos.resumenLabel, resumenCompacto && estilos.resumenLabelCompact]}
                            numberOfLines={2}
                          >
                            {fila.label}
                          </Text>
                          <Text style={estilosLocales.resumenSubtituloInline} numberOfLines={1}>
                            {fila.subtitulo}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[estilos.resumenLabel, resumenCompacto && estilos.resumenLabelCompact]}
                          numberOfLines={4}
                        >
                          {fila.label}
                        </Text>
                      )}
                    </View>
                    <Text style={[estilos.resumenValor, { color: fila.color }]} numberOfLines={1}>
                      {formatearMoneda(fila.valorNum)}
                    </Text>
                  </View>
                ))}
                {hayPedidos && (
                  <View style={[estilos.resumenRow, filasResumenFinanzas.length > 0 && estilos.resumenRowBorder]}>
                    <View style={estilos.resumenLabelColumna}>
                      <Text style={[estilos.resumenLabel, resumenCompacto && estilos.resumenLabelCompact]}>Pedidos</Text>
                    </View>
                    <Text style={estilos.resumenValor}>{totalPedidosCount}</Text>
                  </View>
                )}
              </View>
            )}

            {esCliente && walletSeleccionado && (
              <TouchableOpacity
                style={estilosLocales.asesoriaEntrada}
                onPress={() =>
                  navigation.navigate('AsesoriaMensual', {
                    personaId,
                    personaNombre: persona.nombre,
                    personaNit: persona.nit ?? undefined,
                  })
                }
                activeOpacity={0.88}
              >
                <View style={estilosLocales.asesoriaEntradaIcono}>
                  <Ionicons name="calendar-outline" size={22} color={COLORES.primario} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={estilosLocales.asesoriaEntradaTitulo}>Asesoría mensual</Text>
                  <Text style={estilosLocales.asesoriaEntradaSub} numberOfLines={2}>
                    {asesoriaResp?.suscripcion
                      ? `${formatearMoneda(asesoriaResp.suscripcion.montoMensual)} · ${
                          asesoriaResp.suscripcion.activa ? 'Activa' : 'En pausa'
                        } — tocá para ver historial y opciones`
                      : 'Sin configurar — tocá para agregar'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            )}

            {pedidosPersona.length > 0 && (
              <Text style={estilos.seccionTitulo}>Pedidos propios · {pedidosPersona.length}</Text>
            )}
          </View>
        }
        contentContainerStyle={[estilos.lista, { paddingBottom: pedidosComoProveedor.length > 0 ? 16 : 100 }]}
        ItemSeparatorComponent={() => <View style={{ height: ESPACIADO.sm }} />}
        ListEmptyComponent={
          pedidosComoProveedor.length === 0 ? (
            <View style={estilos.vacio}>
              <View style={estilos.vacioIconBox}>
                <Ionicons name="cube-outline" size={36} color={COLORES.textoDeshabilitado} />
              </View>
              <Text style={estilos.vacioTitulo}>Sin pedidos</Text>
              <Text style={estilos.vacioTexto}>Tocá + para crear uno</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          pedidosComoProveedor.length > 0 ? (
            <View style={{ paddingBottom: 100 }}>
              <View
                style={[
                  estilosLocales.seccionProveedorHeader,
                  resumenCompacto && estilosLocales.seccionProveedorHeaderCol,
                ]}
              >
                <View style={[estilosLocales.seccionProveedorTituloRow, resumenCompacto && { flex: 0, width: '100%' }]}>
                  <Ionicons name="business-outline" size={16} color={COLORES.proveedor} />
                  <Text style={[estilosLocales.seccionProveedorTitulo, { flex: 1, minWidth: 0 }]} numberOfLines={3}>
                    Pedidos como proveedor · {pedidosComoProveedor.length}
                  </Text>
                </View>
                <View style={[estilosLocales.saldoBadgesWrap, resumenCompacto && estilosLocales.saldoBadgesWrapCol]}>
                  {saldoVentasPorCobrarConProveedor > 0.005 && (
                    <View style={[estilosLocales.saldoBadge, { backgroundColor: COLORES.primarioClaro }]}>
                      <Text style={[estilosLocales.saldoBadgeTexto, { color: COLORES.primario }]} numberOfLines={2}>
                        Sin cliente · {formatearMoneda(saldoVentasPorCobrarConProveedor)}
                      </Text>
                    </View>
                  )}
                  {saldoPorCobrarClienteAProveedor > 0.005 && (
                    <View style={[estilosLocales.saldoBadge, { backgroundColor: COLORES.peligroClaro }]}>
                      <Text style={[estilosLocales.saldoBadgeTexto, { color: COLORES.peligro }]} numberOfLines={2}>
                        Por cobrar{' '}
                        <Text style={estilosLocales.saldoBadgeMicro}>{AYUDA_POR_COBRAR_AL_CLIENTE}</Text>
                        {' · '}
                        {formatearMoneda(saldoPorCobrarClienteAProveedor)}
                      </Text>
                    </View>
                  )}
                  {saldoCostoConProveedor > 0.005 && (
                    <View style={[estilosLocales.saldoBadge, { backgroundColor: COLORES.advertenciaClaro }]}>
                      <Text style={[estilosLocales.saldoBadgeTexto, { color: COLORES.advertencia }]} numberOfLines={2}>
                        Le debés al proveedor · {formatearMoneda(saldoCostoConProveedor)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {pedidosComoProveedor.map((item, idx) => (
                <View key={item.id} style={idx < pedidosComoProveedor.length - 1 ? { marginBottom: ESPACIADO.sm } : undefined}>
                  {renderPedidoComoProveedor({ item })}
                </View>
              ))}
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => navigation.navigate('CrearPedido', { personaId: persona.id })} />

      {/* Modal: editar persona */}
      <Modal visible={modalEditar} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={estilosLocales.modalOverlay}>
          <View style={estilosLocales.modalContenido}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: SCROLL_FORM_PADDING_BOTTOM }}
            >
            <View style={estilosLocales.modalHandle} />
            <View style={estilosLocales.modalHeader}>
              <View style={estilosLocales.modalIconBox}>
                <Ionicons name="pencil-outline" size={20} color={COLORES.primario} />
              </View>
              <View>
                <Text style={estilosLocales.modalTitulo}>Editar persona</Text>
                <Text style={estilosLocales.modalSubtitulo}>Cambiá nombre o tipo</Text>
              </View>
            </View>

            {/* Selector tipo */}
            <View style={estilosLocales.tipoRow}>
              {(['cliente', 'proveedor'] as TipoPersona[]).map((t) => {
                const activo = tipoEditable === t;
                const color = t === 'cliente' ? COLORES.cliente : COLORES.proveedor;
                const fondo = t === 'cliente' ? COLORES.clienteClaro : COLORES.proveedorClaro;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[estilosLocales.tipoBtn, activo && { borderColor: color, backgroundColor: fondo }]}
                    onPress={() => setTipoEditable(t)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={t === 'cliente' ? 'person-outline' : 'business-outline'} size={16} color={activo ? color : COLORES.textoSecundario} />
                    <Text style={[estilosLocales.tipoBtnTexto, activo && { color }]}>
                      {t === 'cliente' ? 'Cliente' : 'Proveedor'}
                    </Text>
                    {activo && <Ionicons name="checkmark-circle" size={14} color={color} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <CampoTexto
              etiqueta="Nombre"
              placeholder="Nombre de la persona"
              value={nombreEditable}
              onChangeText={setNombreEditable}
              icono={tipoEditable === 'cliente' ? 'person-outline' : 'business-outline'}
              maxLength={100}
              autoFocus
            />
            <CampoTexto
              etiqueta="NIT (opcional)"
              placeholder="Ej: 1234567-8"
              value={nitEditable}
              onChangeText={setNitEditable}
              icono="card-outline"
              maxLength={30}
              autoCapitalize="characters"
            />
            <CampoTexto
              etiqueta="Dirección (opcional)"
              placeholder="Ej: Calle 5 #12, Ciudad"
              value={direccionEditable}
              onChangeText={setDireccionEditable}
              icono="location-outline"
            />
            <CampoTexto
              etiqueta="Email (opcional)"
              placeholder="contacto@email.com"
              value={emailEditable}
              onChangeText={setEmailEditable}
              keyboardType="email-address"
              autoCapitalize="none"
              icono="mail-outline"
            />
            <CampoTexto
              etiqueta="Teléfono (opcional)"
              placeholder="Ej: +502 3012 3456"
              value={telefonoEditable}
              onChangeText={setTelefonoEditable}
              keyboardType="phone-pad"
              icono="call-outline"
            />

            <View style={estilosLocales.modalBotones}>
              <BotonPrimario
                titulo="Cancelar"
                onPress={() => setModalEditar(false)}
                variante="secundario"
                estilo={{ flex: 1, marginRight: ESPACIADO.sm }}
              />
              <BotonPrimario
                titulo="Guardar"
                onPress={handleGuardarEdicion}
                cargando={guardandoEdicion}
                estilo={{ flex: 1 }}
              />
            </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
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
  resumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIADO.md,
    paddingVertical: ESPACIADO.sm,
  },
  resumenRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  resumenRowCompact: {
    alignItems: 'flex-start',
  },
  resumenLabel: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
  },
  resumenLabelColumna: {
    flex: 1,
    minWidth: 0,
    marginRight: ESPACIADO.sm,
  },
  resumenLabelCompact: {
    fontSize: FUENTE.tamanoXs,
  },
  resumenValor: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    flexShrink: 0,
    textAlign: 'right',
    maxWidth: '48%',
  },
  resumenFila: { flexDirection: 'row', alignItems: 'center' },
  resumenItem: { flex: 1, alignItems: 'center', paddingVertical: ESPACIADO.xs },
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
    paddingVertical: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.md,
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
    flexShrink: 0,
  },
  pedidoCuerpo: {
    flex: 1,
    gap: ESPACIADO.xs,
    minWidth: 0,
  },
  pedidoFilaMonto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 2,
    gap: ESPACIADO.sm,
  },
  pedidoFilaMontoIzq: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pedidoColumnaMontos: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 2,
  },
  pedidoMeta: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 2,
    lineHeight: 16,
  },
  pedidoTipo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  pedidoChevronWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: ESPACIADO.sm,
    flexShrink: 0,
    alignSelf: 'center',
    minWidth: 28,
  },
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

const estilosLocales = StyleSheet.create({
  resumenEtiquetaFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 4,
  },
  resumenSubtituloInline: {
    fontSize: 10,
    lineHeight: 14,
    color: COLORES.textoDeshabilitado,
    fontWeight: FUENTE.pesoNormal,
  },
  pedidoSaldoInterFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: '100%',
  },
  pedidoSaldoMicroAyuda: {
    fontSize: 10,
    fontWeight: FUENTE.pesoNormal,
    color: COLORES.textoSecundario,
  },
  contactoBox: {
    width: '100%',
    marginTop: ESPACIADO.sm,
    gap: 4,
    paddingHorizontal: ESPACIADO.sm,
  },
  contactoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactoTexto: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    flex: 1,
  },
  accionesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ESPACIADO.md,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    paddingTop: ESPACIADO.md,
    width: '100%',
  },
  btnAccion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  btnAccionTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
  },
  accionesDivisor: {
    width: 1,
    height: 20,
    backgroundColor: COLORES.borde,
  },
  // Sección como proveedor
  seccionProveedorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ESPACIADO.sm,
    marginTop: ESPACIADO.lg,
    marginBottom: ESPACIADO.sm,
    paddingHorizontal: 2,
  },
  seccionProveedorHeaderCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  seccionProveedorTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    flexShrink: 0,
    minWidth: 0,
    flex: 1,
  },
  saldoBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACIADO.xs,
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  saldoBadgesWrapCol: {
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  seccionProveedorTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.proveedor,
  },
  saldoBadge: {
    backgroundColor: COLORES.peligroClaro,
    borderRadius: RADIO.xxl,
    paddingHorizontal: ESPACIADO.sm,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  saldoBadgeTexto: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.peligro,
  },
  saldoBadgeMicro: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
  },
  itemProveedor: {
    borderLeftWidth: 3,
    borderLeftColor: COLORES.proveedorClaro,
  },
  itemPedidoWrap: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  puntoPendienteLista: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORES.peligro,
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContenido: {
    backgroundColor: COLORES.fondo,
    borderTopLeftRadius: RADIO.xl,
    borderTopRightRadius: RADIO.xl,
    padding: ESPACIADO.md,
    paddingBottom: ESPACIADO.xl,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORES.bordeOscuro,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: ESPACIADO.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitulo: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  modalSubtitulo: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
  },
  tipoRow: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    marginBottom: ESPACIADO.md,
  },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIO.lg,
    borderWidth: 2,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
  },
  tipoBtnTexto: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
  },
  modalBotones: {
    flexDirection: 'row',
    marginTop: ESPACIADO.md,
  },
  asesoriaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  asesoriaEntradaIcono: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asesoriaEntradaTitulo: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  asesoriaEntradaSub: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 2,
    lineHeight: 16,
  },
});

export default DetallePersona;
