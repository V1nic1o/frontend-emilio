import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { estilos } from './Inicio.estilos';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../hooks/usePedidos';
import { useGastos } from '../hooks/useGastos';
import { useEstadisticas } from '../hooks/useEstadisticas';
import { useAsesoriasPendientes } from '../hooks/useAsesorias';
import { useWallet } from '../contexto/WalletContext';
import { asesoriasServicio } from '../servicios/asesorias.servicio';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';
import { formatearMoneda, esMesActual, formatearFecha } from '../utilidades/formato';
import {
  pedidosRequierenAccionInicio,
  construirFilasPorPagar,
  ventasPorCobrarPendientes,
  esVentaSoloProveedorSinCliente,
  tituloVentaParaListado,
} from '../utilidades/pagosPendientes';
import { TabParamList } from '../navegacion/tipos';
import EstadoBadge from '../componentes/EstadoBadge';
import EncabezadoPanelSuperior from '../componentes/EncabezadoPanelSuperior';

type NavProp = BottomTabNavigationProp<TabParamList>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const DIA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const Inicio: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { walletSeleccionado, finanzasEpoch, volverAElegirWorkspace } = useWallet();
  const { pedidos, cargando: cargandoPedidos, cargar: cargarPedidos } = usePedidos();
  const { gastos, cargando: cargandoGastos, cargar: cargarGastos } = useGastos();
  const { estadisticas, cargando: cargandoStats, cargar: cargarStats } = useEstadisticas();
  const { pendientes: asesoriasPendientes, cargar: cargarAsesoriasPendientes, cargando: cargandoAsesoriasPend } =
    useAsesoriasPendientes();

  const refrescando = cargandoPedidos || cargandoGastos || cargandoStats || cargandoAsesoriasPend;

  const cargar = useCallback(async () => {
    const wid = walletSeleccionado?.id;
    if (wid) {
      try {
        await asesoriasServicio.sincronizar(wid);
      } catch {
        // No bloquear el panel si el sync falla (p. ej. offline)
      }
    }
    await Promise.all([cargarPedidos(), cargarGastos(), cargarStats(), cargarAsesoriasPendientes()]);
  }, [walletSeleccionado, cargarPedidos, cargarGastos, cargarStats, cargarAsesoriasPendientes]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  /** Refresca pedidos, gastos, stats y asesorías pendientes al cambiar finanzas (p. ej. nueva asesoría en otra pantalla). */
  useEffect(() => {
    if (!walletSeleccionado) return;
    if (finanzasEpoch === 0) return;
    void cargar();
  }, [finanzasEpoch, walletSeleccionado, cargar]);

  /** En venta «solo proveedor» el saldo pendiente es el margen (no el bruto totalVenta − totalPagado). */
  const totalPorCobrarVentas = pedidos
    .filter((p) => p.tipo === 'venta')
    .reduce((acc, p) => acc + Math.max(0, p.resumen?.saldoPendiente ?? 0), 0);
  const totalPorCobrarAsesorias = asesoriasPendientes.reduce((acc, a) => acc + a.montoTotal, 0);
  const totalPorCobrar = totalPorCobrarVentas + totalPorCobrarAsesorias;

  const totalPorPagarCompras = pedidos
    .filter((p) => p.tipo === 'compra')
    .reduce((acc, p) => acc + (p.resumen?.saldoPendiente ?? 0), 0);
  const totalPorPagarProveedorVentas = pedidos
    .filter((p) => p.tipo === 'venta' && !!p.proveedorId && !esVentaSoloProveedorSinCliente(p))
    .reduce((acc, p) => acc + (p.resumen?.saldoProveedor ?? 0), 0);
  const totalPorPagar = totalPorPagarCompras + totalPorPagarProveedorVentas;

  const filasPorPagar = useMemo(() => construirFilasPorPagar(pedidos), [pedidos]);
  const ventasPorCobrarList = useMemo(() => ventasPorCobrarPendientes(pedidos), [pedidos]);

  const gastosMes = gastos
    .filter((g) => esMesActual(g.fecha))
    .reduce((acc, g) => acc + g.monto, 0);

  const pedidosPendientes = useMemo(() => pedidosRequierenAccionInicio(pedidos), [pedidos]);

  const irAListaPedidos = useCallback(() => {
    navigation.navigate('PedidosTab', { screen: 'ListaPedidos' });
  }, [navigation]);

  /** Una sola asesoría: ir directo. Varias: pantalla de listado para elegir. */
  const irAGestionarAsesoriasPendientes = useCallback(() => {
    if (asesoriasPendientes.length === 0) {
      navigation.navigate('PersonasTab', { screen: 'ListaPersonas' });
      return;
    }
    if (asesoriasPendientes.length === 1) {
      const a = asesoriasPendientes[0];
      navigation.navigate('PersonasTab', {
        screen: 'AsesoriaMensual',
        params: { personaId: a.personaId, personaNombre: a.personaNombre },
      });
      return;
    }
    navigation.navigate('InicioTab', { screen: 'AsesoriasPendientesCobro' });
  }, [navigation, asesoriasPendientes]);

  const irADetallePedido = useCallback(
    (pedidoId: number) => {
      navigation.navigate('PedidosTab', {
        state: {
          routes: [{ name: 'ListaPedidos' }, { name: 'DetallePedido', params: { pedidoId } }],
          index: 1,
        },
      });
    },
    [navigation],
  );

  const irAPedidosPorPagarLista = useCallback(() => {
    navigation.navigate('InicioTab', { screen: 'PedidosPorPagar' });
  }, [navigation]);

  const irAPendientesSinSaldarPantalla = useCallback(() => {
    navigation.navigate('InicioTab', { screen: 'PendientesSinSaldar' });
  }, [navigation]);

  const irAPorCobrarDetalle = useCallback(() => {
    navigation.navigate('InicioTab', { screen: 'PorCobrarDetalle' });
  }, [navigation]);

  const irAPerfil = useCallback(() => {
    navigation.navigate('InicioTab', { screen: 'Perfil' });
  }, [navigation]);

  const onNotificacionesPlaceholder = useCallback(() => {
    // Reservado: conectar a centro de notificaciones cuando exista backend.
  }, []);

  const irADetalleGananciaMes = useCallback(() => {
    navigation.navigate('InicioTab', { screen: 'DetalleGananciaMes' });
  }, [navigation]);

  const irAResumenPeriodo = useCallback(() => {
    navigation.navigate('InicioTab', { screen: 'ResumenPeriodo' });
  }, [navigation]);

  /** Tarjeta «Por pagar»: un solo ítem → detalle; varios → listado en Inicio. */
  const onPressPorPagar = useCallback(() => {
    if (totalPorPagar <= 0) return;
    if (filasPorPagar.length === 0) {
      irAListaPedidos();
      return;
    }
    if (filasPorPagar.length === 1) {
      const id = filasPorPagar[0]?.pedidoId;
      if (id != null) irADetallePedido(id);
      else irAListaPedidos();
      return;
    }
    irAPedidosPorPagarLista();
  }, [totalPorPagar, filasPorPagar, irAListaPedidos, irADetallePedido, irAPedidosPorPagarLista]);

  /**
   * Tarjeta «Por cobrar»: sin diálogo — listado unificado (ventas + asesorías) como «Por pagar»;
   * una sola venta y sin asesorías → detalle del pedido; solo asesorías → flujo existente (1 directo, varias lista).
   */
  const onPressPorCobrar = useCallback(() => {
    if (totalPorCobrar <= 0) return;
    const hayVentas = totalPorCobrarVentas > 0;
    const hayAsesorias = totalPorCobrarAsesorias > 0;
    const nVentas = ventasPorCobrarList.length;
    const nAs = asesoriasPendientes.length;

    if (!hayVentas && hayAsesorias) {
      irAGestionarAsesoriasPendientes();
      return;
    }

    if (hayVentas && !hayAsesorias) {
      if (nVentas === 1) {
        const id = ventasPorCobrarList[0]?.pedido.id;
        if (id != null) irADetallePedido(id);
        else irAListaPedidos();
        return;
      }
      if (nVentas > 1) {
        irAPorCobrarDetalle();
        return;
      }
      irAListaPedidos();
      return;
    }

    if (hayVentas && hayAsesorias) {
      irAPorCobrarDetalle();
      return;
    }
  }, [
    totalPorCobrar,
    totalPorCobrarVentas,
    totalPorCobrarAsesorias,
    ventasPorCobrarList,
    asesoriasPendientes,
    irAGestionarAsesoriasPendientes,
    irADetallePedido,
    irAListaPedidos,
    irAPorCobrarDetalle,
  ]);

  /**
   * «Sin saldar» e «Ir a…» (Requieren pago): un solo ítem → pantalla directa;
   * solo muchas asesorías → listado de asesorías; varios pedidos o mezcla → pantalla unificada.
   */
  const onPressSinSaldar = useCallback(() => {
    const nPed = pedidosPendientes.length;
    const nAs = asesoriasPendientes.length;
    if (nPed + nAs === 0) return;
    if (nPed === 1 && nAs === 0) {
      const id = pedidosPendientes[0]?.id;
      if (id != null) irADetallePedido(id);
      else irAPendientesSinSaldarPantalla();
      return;
    }
    if (nPed === 0 && nAs === 1) {
      irAGestionarAsesoriasPendientes();
      return;
    }
    if (nPed === 0 && nAs > 1) {
      irAGestionarAsesoriasPendientes();
      return;
    }
    if (nPed > 1 && nAs === 0) {
      irAPendientesSinSaldarPantalla();
      return;
    }
    if (nPed > 0 && nAs > 0) {
      irAPendientesSinSaldarPantalla();
      return;
    }
  }, [
    pedidosPendientes,
    asesoriasPendientes,
    irADetallePedido,
    irAGestionarAsesoriasPendientes,
    irAPendientesSinSaldarPantalla,
  ]);

  const onPressVerTodoRequierenPago = onPressSinSaldar;

  const subtituloTarjetaPorCobrar = useMemo(() => {
    if (totalPorCobrar <= 0) return 'Sin montos pendientes';
    if (totalPorCobrarVentas > 0 && totalPorCobrarAsesorias <= 0) return 'Solo de pedidos (ventas)';
    if (totalPorCobrarAsesorias > 0 && totalPorCobrarVentas <= 0) return 'Solo de asesorías mensuales';
    return `${formatearMoneda(totalPorCobrarVentas)} ventas · ${formatearMoneda(totalPorCobrarAsesorias)} asesorías`;
  }, [totalPorCobrar, totalPorCobrarVentas, totalPorCobrarAsesorias]);

  const subtituloTarjetaSinSaldar = useMemo(() => {
    const nPed = pedidosPendientes.length;
    const nAs = asesoriasPendientes.length;
    const n = nPed + nAs;
    if (n === 0) return 'Sin ítems pendientes';
    if (nAs === 0) return `${nPed} en pedidos`;
    if (nPed === 0) return `${nAs} en asesorías`;
    return `${nPed} pedidos · ${nAs} asesorías`;
  }, [pedidosPendientes.length, asesoriasPendientes.length]);

  const subtituloTarjetaPorPagar = useMemo(() => {
    if (totalPorPagar <= 0) return 'Sin montos a pagar';
    if (totalPorPagarCompras > 0 && totalPorPagarProveedorVentas <= 0) return 'Solo compras a proveedor';
    if (totalPorPagarProveedorVentas > 0 && totalPorPagarCompras <= 0) return 'Solo pago a proveedor en ventas';
    return `${formatearMoneda(totalPorPagarCompras)} compras · ${formatearMoneda(totalPorPagarProveedorVentas)} en ventas`;
  }, [totalPorPagar, totalPorPagarCompras, totalPorPagarProveedorVentas]);

  const hoy = new Date();
  const fechaTexto = `${DIA_SEMANA[hoy.getDay()]}, ${hoy.getDate()} de ${MES[hoy.getMonth()]}`;

  const gananciaNeta = estadisticas?.gananciaNeta ?? 0;
  const gananciaMes = estadisticas?.porMes.find(
    (m) => m.anio === hoy.getFullYear() && m.mes === ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][hoy.getMonth()]
  );
  const gananciaNetaMes = gananciaMes?.gananciaNeta ?? 0;
  const gananciaBruta_Mes = gananciaMes?.ganancia ?? 0;
  const netaMesPedidos =
    typeof gananciaMes?.gananciaNetaPedidos === 'number' ? gananciaMes.gananciaNetaPedidos : gananciaNetaMes;
  const netaMesAsesorias = typeof gananciaMes?.gananciaNetaAsesorias === 'number' ? gananciaMes.gananciaNetaAsesorias : 0;
  const ingresosMesAsesorias = gananciaMes?.ingresosAsesorias ?? 0;
  const ingresosMesPedidos =
    gananciaMes == null
      ? 0
      : typeof gananciaMes.ingresosPedidos === 'number'
        ? gananciaMes.ingresosPedidos
        : Math.max(0, gananciaMes.ingresos - ingresosMesAsesorias);

  const esGananciaPositiva = gananciaNeta >= 0;
  const esGananciaMesPositiva = gananciaNetaMes >= 0;
  /** Azul puro para esta tarjeta (sin violeta del primario ni del color del workspace). */
  const colorFondoResumenPeriodo = '#2563EB';

  return (
    <SafeAreaView style={estilos.contenedor} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor={COLORES.primario} />
        }
        showsVerticalScrollIndicator={false}
      >
        <EncabezadoPanelSuperior
          lineaSuperior={fechaTexto}
          titulo="Panel de control"
          onPressPerfil={irAPerfil}
          onPressNotificaciones={onNotificacionesPlaceholder}
          onPressCambiarWorkspace={volverAElegirWorkspace}
          colorWorkspace={walletSeleccionado?.color}
        />

        {/* 1. Pendiente de cobro/pago + tarjetas + lista */}
        <Text style={estilos.seccionTitulo}>Pendiente de cobro/pago</Text>
        <View style={estilos.gridDos}>
          <TarjetaFinanciera
            titulo="Por cobrar"
            subtitulo={subtituloTarjetaPorCobrar}
            valor={formatearMoneda(totalPorCobrar)}
            icono="trending-up-outline"
            color={COLORES.pagado}
            fondo={COLORES.pagadoClaro}
            onPress={onPressPorCobrar}
            subtituloNumeroDeLineas={2}
          />
          <TarjetaFinanciera
            titulo="Por pagar"
            subtitulo={subtituloTarjetaPorPagar}
            valor={formatearMoneda(totalPorPagar)}
            icono="trending-down-outline"
            color={COLORES.pendiente}
            fondo={COLORES.pendienteClaro}
            onPress={onPressPorPagar}
            subtituloNumeroDeLineas={2}
          />
        </View>
        <View style={estilos.gridDos}>
          <TarjetaFinanciera
            titulo="Gastos del mes"
            subtitulo={`${MES[hoy.getMonth()]} ${hoy.getFullYear()}`}
            valor={formatearMoneda(gastosMes)}
            icono="receipt-outline"
            color={COLORES.advertencia}
            fondo={COLORES.advertenciaClaro}
            onPress={() => navigation.navigate('GastosTab', { screen: 'ListaGastos' })}
          />
          <TarjetaFinanciera
            titulo="Sin saldar"
            subtitulo={subtituloTarjetaSinSaldar}
            valor={String(pedidosPendientes.length + asesoriasPendientes.length)}
            icono="time-outline"
            color={COLORES.primario}
            fondo={COLORES.primarioClaro}
            onPress={onPressSinSaldar}
            esNumero
            subtituloNumeroDeLineas={2}
          />
        </View>

        {(pedidosPendientes.length > 0 || asesoriasPendientes.length > 0) && (
          <>
            <View style={estilos.seccionTituloFila}>
              <Text style={estilos.seccionTitulo}>Requieren acción</Text>
              <TouchableOpacity onPress={onPressVerTodoRequierenPago}>
                <Text style={estilos.verTodos}>Ir a…</Text>
              </TouchableOpacity>
            </View>
            {pedidosPendientes.slice(0, 4).map((p) => {
              const esVenta = p.tipo === 'venta';
              const saldoCliente = p.resumen?.saldoPendiente ?? 0;
              const saldoProv =
                esVenta && p.proveedorId && !esVentaSoloProveedorSinCliente(p)
                  ? (p.resumen?.saldoProveedor ?? 0)
                  : 0;
              const saldoMostrar = saldoCliente > 0 ? saldoCliente : saldoProv;
              const estadoMostrar = saldoCliente > 0
                ? (p.resumen?.estado ?? 'pendiente')
                : (p.resumen?.estadoProveedor ?? 'pendiente');
              return (
                <TouchableOpacity
                  key={p.id}
                  style={estilos.itemPendiente}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('PedidosTab', {
                      state: {
                        routes: [{ name: 'ListaPedidos' }, { name: 'DetallePedido', params: { pedidoId: p.id } }],
                        index: 1,
                      },
                    })
                  }
                >
                  <View style={[estilos.pendIconBox, { backgroundColor: esVenta ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                    <Ionicons
                      name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                      size={20}
                      color={esVenta ? COLORES.primario : COLORES.morado}
                    />
                  </View>
                  <View style={estilos.pendInfo}>
                    <Text style={estilos.pendPersona}>{tituloVentaParaListado(p)}</Text>
                    <Text style={estilos.pendFecha}>{formatearFecha(p.fecha)}</Text>
                  </View>
                  <View style={estilos.pendDer}>
                    {p.resumen && (
                      <EstadoBadge
                        estado={estadoMostrar}
                        varianteCobro={esVenta && esVentaSoloProveedorSinCliente(p) && saldoCliente > 0}
                      />
                    )}
                    <Text style={estilos.pendSaldo}>{formatearMoneda(saldoMostrar)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={COLORES.textoDeshabilitado} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })}
            {asesoriasPendientes.slice(0, 4).map((a) => (
              <TouchableOpacity
                key={`asesoria-${a.cobroId}`}
                style={estilos.itemPendiente}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('PersonasTab', {
                    screen: 'AsesoriaMensual',
                    params: { personaId: a.personaId, personaNombre: a.personaNombre },
                  })
                }
              >
                <View style={[estilos.pendIconBox, { backgroundColor: COLORES.moradoClaro }]}>
                  <Ionicons name="calendar-outline" size={20} color={COLORES.morado} />
                </View>
                <View style={estilos.pendInfo}>
                  <Text style={estilos.pendPersona}>{a.personaNombre}</Text>
                  <Text style={estilos.pendFecha}>
                    Asesoría · {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][a.mes - 1] ?? a.mes} {a.anio}
                  </Text>
                </View>
                <View style={estilos.pendDer}>
                  <EstadoBadge estado="pendiente" />
                  <Text style={estilos.pendSaldo}>{formatearMoneda(a.montoTotal)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={COLORES.textoDeshabilitado} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* 2. Crear nuevo — acciones rápidas */}
        <Text style={estilos.seccionTitulo}>Crear nuevo</Text>
        <View style={estilos.accionesGrid}>
          <AccionRapida
            icono="person-add-outline"
            titulo="Persona"
            descripcion="Cliente o proveedor"
            color={COLORES.primario}
            fondo={COLORES.primarioClaro}
            onPress={() => navigation.navigate('PersonasTab', { screen: 'CrearPersona' })}
          />
          <AccionRapida
            icono="bag-add-outline"
            titulo="Pedido"
            descripcion="Venta o compra"
            color={COLORES.morado}
            fondo={COLORES.moradoClaro}
            onPress={() => navigation.navigate('PedidosTab', { screen: 'CrearPedido', params: {} })}
          />
          <AccionRapida
            icono="add-circle-outline"
            titulo="Gasto"
            descripcion="Registrar egreso"
            color={COLORES.advertencia}
            fondo={COLORES.advertenciaClaro}
            onPress={() => navigation.navigate('GastosTab', { screen: 'CrearGasto' })}
          />
        </View>

        {/* 3. Ganancia neta — este mes (tocar abre desglose; ya no solo «Pedidos») */}
        <TouchableOpacity
          style={[estilos.gananciaCard, { backgroundColor: esGananciaMesPositiva ? COLORES.primario : COLORES.peligro }]}
          activeOpacity={0.92}
          onPress={irADetalleGananciaMes}
          accessibilityRole="button"
          accessibilityLabel="Ver detalle de ganancia de este mes"
        >
          <View style={estilos.gananciaTitulo}>
            <View style={estilos.gananciaTituloLeft}>
              <View style={estilos.gananciaBadge}>
                <Ionicons name="stats-chart" size={13} color={COLORES.blanco} />
                <Text style={estilos.gananciaBadgeTexto}>Este mes</Text>
              </View>
              <Text style={estilos.gananciaEtiqueta}>Ganancia neta</Text>
            </View>
            <View style={estilos.gananciaInfoBtn}>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </View>
          </View>

          <Text
            style={estilos.gananciaValor}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {esGananciaMesPositiva ? '' : '−'}{formatearMoneda(Math.abs(gananciaNetaMes))}
          </Text>

          <View style={estilos.gananciaNetaSplit}>
            <View style={estilos.gananciaNetaSplitCol}>
              <Text style={estilos.gananciaNetaSplitTitulo}>Pedidos</Text>
              <Text style={estilos.gananciaNetaSplitMonto}>
                {netaMesPedidos >= 0 ? '' : '−'}
                {formatearMoneda(Math.abs(netaMesPedidos))}
              </Text>
              <Text style={estilos.gananciaNetaSplitIngresos}>Ingresos {formatearMoneda(ingresosMesPedidos)}</Text>
            </View>
            <View style={estilos.gananciaNetaSplitSep} />
            <View style={estilos.gananciaNetaSplitCol}>
              <Text style={estilos.gananciaNetaSplitTitulo}>Asesorías</Text>
              <Text style={estilos.gananciaNetaSplitMonto}>
                {netaMesAsesorias >= 0 ? '' : '−'}
                {formatearMoneda(Math.abs(netaMesAsesorias))}
              </Text>
              <Text style={estilos.gananciaNetaSplitIngresos}>Ingresos {formatearMoneda(ingresosMesAsesorias)}</Text>
            </View>
          </View>
          <Text style={estilos.gananciaNetaSplitAyuda}>
            Pedidos: ingresos y costo según cobros registrados en el mes. Los gastos se reparten entre pedidos y asesorías según el margen bruto de cada uno.
          </Text>

          <View style={estilos.gananciaDivider} />
          <View style={estilos.gananciaDesglose}>
            <View style={estilos.gananciaItem}>
              <Ionicons name="trending-up-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={estilos.gananciaItemLabel}>Ingresos</Text>
              <Text style={estilos.gananciaItemValor}>{formatearMoneda(gananciaMes?.ingresos ?? 0)}</Text>
            </View>
            <View style={estilos.gananciaItemSep} />
            <View style={estilos.gananciaItem}>
              <Ionicons name="cube-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={estilos.gananciaItemLabel}>Costo</Text>
              <Text style={estilos.gananciaItemValor}>{formatearMoneda(gananciaMes?.costoVentas ?? 0)}</Text>
            </View>
            <View style={estilos.gananciaItemSep} />
            <View style={estilos.gananciaItem}>
              <Ionicons name="receipt-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={estilos.gananciaItemLabel}>Gastos</Text>
              <Text style={estilos.gananciaItemValor}>{formatearMoneda(gananciaMes?.gastos ?? 0)}</Text>
            </View>
          </View>

          {gananciaBruta_Mes !== 0 && (
            <View style={estilos.gananciaFooter}>
              <Text style={estilos.gananciaFooterTexto}>
                Margen bruto del mes: {formatearMoneda(gananciaBruta_Mes)}
              </Text>
            </View>
          )}
          <Text style={estilos.gananciaTocarHint}>Tocá para ver el desglose completo</Text>
        </TouchableOpacity>

        {/* 4. Últimos 6 meses */}
        {estadisticas &&
          estadisticas.porMes.some(
            (m) =>
              m.ingresos > 0 ||
              m.gastos > 0 ||
              (m.impuestosIva ?? 0) > 0 ||
              Math.abs(m.gananciaNeta) > 0.005,
          ) && (
          <>
            <Text style={estilos.seccionTitulo}>Últimos 6 meses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.barrasScroll} contentContainerStyle={{ gap: ESPACIADO.sm, paddingHorizontal: ESPACIADO.md }}>
              {estadisticas.porMes.map((m, idx) => {
                const esActual = idx === estadisticas.porMes.length - 1;
                const pos = m.gananciaNeta >= 0;
                const ivaMes = m.impuestosIva ?? 0;
                return (
                  <View key={`${m.mes}-${m.anio}`} style={[estilos.barraCard, esActual && estilos.barraCardActual]}>
                    <Text style={[estilos.barraMes, esActual && estilos.barraMesActual]}>{m.mes}</Text>
                    <Text style={[estilos.barraValor, { color: pos ? COLORES.pagado : COLORES.pendiente }]}>
                      {pos ? '' : '−'}{formatearMoneda(Math.abs(m.gananciaNeta))}
                    </Text>
                    <Text style={estilos.barraIva}>IVA {formatearMoneda(ivaMes)}</Text>
                    <View style={[estilos.barraIndicador, { backgroundColor: pos ? COLORES.pagado : COLORES.pendiente }]} />
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        <TouchableOpacity
          style={[estilos.gananciaCard, { backgroundColor: colorFondoResumenPeriodo, marginTop: ESPACIADO.xs }]}
          onPress={irAResumenPeriodo}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel="Abrir resumen por periodo"
        >
          <View style={estilos.gananciaTitulo}>
            <View style={estilos.gananciaTituloLeft}>
              <View style={estilos.gananciaBadge}>
                <Ionicons name="bar-chart-outline" size={13} color={COLORES.blanco} />
                <Text style={estilos.gananciaBadgeTexto}>Tendencia</Text>
              </View>
              <Text style={estilos.accesoResumenPeriodoHero}>Resumen por periodo</Text>
            </View>
            <View style={estilos.gananciaInfoBtn}>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
          <Text style={estilos.accesoResumenPeriodoSubBlanco}>Mes, año y tendencia del workspace</Text>
        </TouchableOpacity>

        {/* 5. Ingresos / gastos / IVA / ganancia neta totales */}
        {estadisticas &&
          (estadisticas.totalIngresos > 0 ||
            estadisticas.totalGastos > 0 ||
            (estadisticas.totalImpuestosIva ?? 0) > 0 ||
            Math.abs(estadisticas.gananciaNeta) > 0.005) && (
          <View style={estilos.totalHistCard}>
            <View style={estilos.totalHistFila}>
              <View style={estilos.totalHistItem}>
                <Ionicons name="trending-up" size={16} color={COLORES.pagado} />
                <Text style={estilos.totalHistLabel}>Ingresos totales</Text>
                <Text style={[estilos.totalHistValor, { color: COLORES.pagado }]}>{formatearMoneda(estadisticas.totalIngresos)}</Text>
              </View>
              <View style={estilos.totalHistSep} />
              <View style={estilos.totalHistItem}>
                <Ionicons name="receipt" size={16} color={COLORES.pendiente} />
                <Text style={estilos.totalHistLabel}>Gastos totales</Text>
                <Text style={[estilos.totalHistValor, { color: COLORES.pendiente }]}>{formatearMoneda(estadisticas.totalGastos)}</Text>
              </View>
            </View>
            <View style={estilos.totalHistRowSep} />
            <View style={estilos.totalHistFila}>
              <View style={estilos.totalHistItem}>
                <Ionicons name="pricetag-outline" size={16} color={COLORES.morado} />
                <Text style={estilos.totalHistLabel}>IVA cobrado</Text>
                <Text style={[estilos.totalHistValor, { color: COLORES.morado }]}>
                  {formatearMoneda(estadisticas.totalImpuestosIva ?? 0)}
                </Text>
              </View>
              <View style={estilos.totalHistSep} />
              <View style={estilos.totalHistItem}>
                <Ionicons name="stats-chart" size={16} color={esGananciaPositiva ? COLORES.primario : COLORES.peligro} />
                <Text style={estilos.totalHistLabel}>Ganancia neta</Text>
                <Text style={[estilos.totalHistValor, { color: esGananciaPositiva ? COLORES.primario : COLORES.peligro }]}>
                  {esGananciaPositiva ? '' : '−'}{formatearMoneda(Math.abs(gananciaNeta))}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Crédito de desarrollador */}
        <View style={estilos.creditoBox}>
          <Text style={estilos.creditoTexto}>Desarrollado por Vinicio Valdez</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

interface PropsTarjeta {
  titulo: string;
  subtitulo: string;
  valor: string;
  icono: IoniconName;
  color: string;
  fondo: string;
  onPress: () => void;
  esNumero?: boolean;
  /** Permite desglosar montos (ventas · asesorías) sin recortar en una sola línea. */
  subtituloNumeroDeLineas?: number;
}

const TarjetaFinanciera: React.FC<PropsTarjeta> = ({
  titulo,
  subtitulo,
  valor,
  icono,
  color,
  fondo,
  onPress,
  esNumero,
  subtituloNumeroDeLineas = 1,
}) => (
  <TouchableOpacity style={estilos.tarjeta} onPress={onPress} activeOpacity={0.85}>
    <View style={[estilos.tarjetaIconBox, { backgroundColor: fondo }]}>
      <Ionicons name={icono} size={18} color={color} />
    </View>
    <Text style={[estilos.tarjetaValor, esNumero && { fontSize: FUENTE.tamanoXl }]}>{valor}</Text>
    <Text style={estilos.tarjetaTitulo}>{titulo}</Text>
    <Text style={estilos.tarjetaSubtitulo} numberOfLines={subtituloNumeroDeLineas}>
      {subtitulo}
    </Text>
  </TouchableOpacity>
);

interface PropsAccion {
  icono: IoniconName;
  titulo: string;
  descripcion: string;
  color: string;
  fondo: string;
  onPress: () => void;
}

const AccionRapida: React.FC<PropsAccion> = ({ icono, titulo, descripcion, color, fondo, onPress }) => (
  <TouchableOpacity style={estilos.accion} onPress={onPress} activeOpacity={0.82}>
    <View style={[estilos.accionIconBox, { backgroundColor: fondo }]}>
      <Ionicons name={icono} size={24} color={color} />
    </View>
    <Text style={estilos.accionTitulo}>{titulo}</Text>
    <Text style={estilos.accionDesc}>{descripcion}</Text>
  </TouchableOpacity>
);

export default Inicio;
