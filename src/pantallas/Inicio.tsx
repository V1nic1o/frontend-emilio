import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { usePedidos } from '../hooks/usePedidos';
import { useGastos } from '../hooks/useGastos';
import { useEstadisticas } from '../hooks/useEstadisticas';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';
import { formatearMoneda, esMesActual, formatearFecha } from '../utilidades/formato';
import { TabParamList } from '../navegacion/tipos';
import EstadoBadge from '../componentes/EstadoBadge';

type NavProp = BottomTabNavigationProp<TabParamList>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const DIA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const Inicio: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { pedidos, cargando: cargandoPedidos, cargar: cargarPedidos } = usePedidos();
  const { gastos, cargando: cargandoGastos, cargar: cargarGastos } = useGastos();
  const { estadisticas, cargando: cargandoStats, cargar: cargarStats } = useEstadisticas();

  const refrescando = cargandoPedidos || cargandoGastos || cargandoStats;

  const cargar = useCallback(() => {
    cargarPedidos();
    cargarGastos();
    cargarStats();
  }, [cargarPedidos, cargarGastos, cargarStats]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPorCobrar = pedidos
    .filter((p) => p.tipo === 'venta')
    .reduce((acc, p) => acc + Math.max(0, (p.resumen?.totalVenta ?? 0) - (p.resumen?.totalPagado ?? 0)), 0);

  const totalPorPagar = pedidos
    .filter((p) => p.tipo === 'compra')
    .reduce((acc, p) => acc + Math.max(0, (p.resumen?.totalCompra ?? 0) - (p.resumen?.totalPagado ?? 0)), 0);

  const gastosMes = gastos
    .filter((g) => esMesActual(g.fecha))
    .reduce((acc, g) => acc + g.monto, 0);

  const pedidosPendientes = pedidos.filter(
    (p) => p.resumen?.estado === 'pendiente' || p.resumen?.estado === 'parcial'
  );

  const hoy = new Date();
  const fechaTexto = `${DIA_SEMANA[hoy.getDay()]}, ${hoy.getDate()} de ${MES[hoy.getMonth()]}`;

  const gananciaNeta = estadisticas?.gananciaNeta ?? 0;
  const gananciaBruta = estadisticas?.gananciaBruta ?? 0;
  const gananciaMes = estadisticas?.porMes.find(
    (m) => m.anio === hoy.getFullYear() && m.mes === ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][hoy.getMonth()]
  );
  const gananciaNetaMes = gananciaMes?.gananciaNeta ?? 0;
  const gananciaBruta_Mes = gananciaMes?.ganancia ?? 0;

  const esGananciaPositiva = gananciaNeta >= 0;
  const esGananciaMesPositiva = gananciaNetaMes >= 0;

  return (
    <SafeAreaView style={estilos.contenedor} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={cargar} tintColor={COLORES.primario} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={estilos.header}>
          <View>
            <Text style={estilos.fechaTexto}>{fechaTexto}</Text>
            <Text style={estilos.titulo}>Panel de control</Text>
          </View>
          <View style={estilos.avatarBox}>
            <Ionicons name="storefront" size={22} color={COLORES.primario} />
          </View>
        </View>

        {/* ═══ GANANCIA — bloque principal ═══ */}
        <View style={[estilos.gananciaCard, { backgroundColor: esGananciaMesPositiva ? COLORES.primario : COLORES.peligro }]}>
          <View style={estilos.gananciaTitulo}>
            <View style={estilos.gananciaTituloLeft}>
              <View style={estilos.gananciaBadge}>
                <Ionicons name="stats-chart" size={13} color={COLORES.blanco} />
                <Text style={estilos.gananciaBadgeTexto}>Este mes</Text>
              </View>
              <Text style={estilos.gananciaEtiqueta}>Ganancia neta</Text>
            </View>
            <TouchableOpacity
              style={estilos.gananciaInfoBtn}
              onPress={() => navigation.navigate('PedidosTab', { screen: 'ListaPedidos' })}
            >
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <Text style={estilos.gananciaValor}>
            {esGananciaMesPositiva ? '' : '−'}{formatearMoneda(Math.abs(gananciaNetaMes))}
          </Text>

          {/* Desglose mes */}
          <View style={estilos.gananciaDivider} />
          <View style={estilos.gananciaDesglose}>
            <View style={estilos.gananciaItem}>
              <Ionicons name="trending-up-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={estilos.gananciaItemLabel}>Ventas</Text>
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

          {/* Ganancia bruta del mes */}
          {gananciaBruta_Mes !== 0 && (
            <View style={estilos.gananciaFooter}>
              <Text style={estilos.gananciaFooterTexto}>
                Margen bruto del mes: {formatearMoneda(gananciaBruta_Mes)}
              </Text>
            </View>
          )}
        </View>

        {/* Historial de ganancias por mes */}
        {estadisticas && estadisticas.porMes.some((m) => m.ingresos > 0 || m.gastos > 0) && (
          <>
            <Text style={estilos.seccionTitulo}>Últimos 6 meses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.barrasScroll} contentContainerStyle={{ gap: ESPACIADO.sm, paddingHorizontal: ESPACIADO.md }}>
              {estadisticas.porMes.map((m, idx) => {
                const esActual = idx === estadisticas.porMes.length - 1;
                const pos = m.gananciaNeta >= 0;
                return (
                  <View key={`${m.mes}-${m.anio}`} style={[estilos.barraCard, esActual && estilos.barraCardActual]}>
                    <Text style={[estilos.barraMes, esActual && estilos.barraMesActual]}>{m.mes}</Text>
                    <Text style={[estilos.barraValor, { color: pos ? COLORES.pagado : COLORES.pendiente }]}>
                      {pos ? '' : '−'}{formatearMoneda(Math.abs(m.gananciaNeta))}
                    </Text>
                    <View style={[estilos.barraIndicador, { backgroundColor: pos ? COLORES.pagado : COLORES.pendiente }]} />
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Total histórico */}
        {estadisticas && (estadisticas.totalIngresos > 0 || estadisticas.totalGastos > 0) && (
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

        {/* Financiero pendiente */}
        <Text style={estilos.seccionTitulo}>Pendiente de cobro/pago</Text>
        <View style={estilos.gridDos}>
          <TarjetaFinanciera
            titulo="Por cobrar"
            subtitulo="ventas sin cobrar"
            valor={formatearMoneda(totalPorCobrar)}
            icono="trending-up-outline"
            color={COLORES.pagado}
            fondo={COLORES.pagadoClaro}
            onPress={() => navigation.navigate('PedidosTab', { screen: 'ListaPedidos' })}
          />
          <TarjetaFinanciera
            titulo="Por pagar"
            subtitulo="compras sin pagar"
            valor={formatearMoneda(totalPorPagar)}
            icono="trending-down-outline"
            color={COLORES.pendiente}
            fondo={COLORES.pendienteClaro}
            onPress={() => navigation.navigate('PedidosTab', { screen: 'ListaPedidos' })}
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
            subtitulo={`${pedidosPendientes.length} pedido${pedidosPendientes.length !== 1 ? 's' : ''}`}
            valor={String(pedidosPendientes.length)}
            icono="time-outline"
            color={COLORES.primario}
            fondo={COLORES.primarioClaro}
            onPress={() => navigation.navigate('PedidosTab', { screen: 'ListaPedidos' })}
            esNumero
          />
        </View>

        {/* Acciones rápidas */}
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

        {/* Pedidos con saldo pendiente */}
        {pedidosPendientes.length > 0 && (
          <>
            <View style={estilos.seccionTituloFila}>
              <Text style={estilos.seccionTitulo}>Requieren pago</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PedidosTab', { screen: 'ListaPedidos' })}>
                <Text style={estilos.verTodos}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {pedidosPendientes.slice(0, 4).map((p) => {
              const esVenta = p.tipo === 'venta';
              const total = esVenta ? (p.resumen?.totalVenta ?? 0) : (p.resumen?.totalCompra ?? 0);
              const saldo = Math.max(0, total - (p.resumen?.totalPagado ?? 0));
              return (
                <TouchableOpacity
                  key={p.id}
                  style={estilos.itemPendiente}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PedidosTab', { screen: 'DetallePedido', params: { pedidoId: p.id } })}
                >
                  <View style={[estilos.pendIconBox, { backgroundColor: esVenta ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                    <Ionicons
                      name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                      size={20}
                      color={esVenta ? COLORES.primario : COLORES.morado}
                    />
                  </View>
                  <View style={estilos.pendInfo}>
                    <Text style={estilos.pendPersona}>{p.persona?.nombre ?? '—'}</Text>
                    <Text style={estilos.pendFecha}>{formatearFecha(p.fecha)}</Text>
                  </View>
                  <View style={estilos.pendDer}>
                    {p.resumen && <EstadoBadge estado={p.resumen.estado} />}
                    <Text style={estilos.pendSaldo}>{formatearMoneda(saldo)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={COLORES.textoDeshabilitado} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })}
          </>
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
}

const TarjetaFinanciera: React.FC<PropsTarjeta> = ({ titulo, subtitulo, valor, icono, color, fondo, onPress, esNumero }) => (
  <TouchableOpacity style={estilos.tarjeta} onPress={onPress} activeOpacity={0.85}>
    <View style={[estilos.tarjetaIconBox, { backgroundColor: fondo }]}>
      <Ionicons name={icono} size={18} color={color} />
    </View>
    <Text style={[estilos.tarjetaValor, esNumero && { fontSize: FUENTE.tamanoXl }]}>{valor}</Text>
    <Text style={estilos.tarjetaTitulo}>{titulo}</Text>
    <Text style={estilos.tarjetaSubtitulo}>{subtitulo}</Text>
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

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xxl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: ESPACIADO.sm,
    marginBottom: ESPACIADO.lg,
  },
  fechaTexto: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  titulo: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -0.5,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Ganancia card ────────────────────────────────────────────────────────
  gananciaCard: {
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    marginBottom: ESPACIADO.md,
  },
  gananciaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ESPACIADO.sm,
  },
  gananciaTituloLeft: { gap: 5 },
  gananciaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIO.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  gananciaBadgeTexto: { fontSize: FUENTE.tamanoXs, color: COLORES.blanco, fontWeight: FUENTE.pesoSemibold },
  gananciaEtiqueta: { fontSize: FUENTE.tamanoPequeno, color: 'rgba(255,255,255,0.8)' },
  gananciaInfoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gananciaValor: {
    fontSize: 36,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
    letterSpacing: -1.5,
    marginBottom: ESPACIADO.md,
  },
  gananciaDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: ESPACIADO.md },
  gananciaDesglose: { flexDirection: 'row', alignItems: 'center' },
  gananciaItem: { flex: 1, alignItems: 'center', gap: 3 },
  gananciaItemLabel: { fontSize: FUENTE.tamanoXs, color: 'rgba(255,255,255,0.75)' },
  gananciaItemValor: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.blanco },
  gananciaItemSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  gananciaFooter: {
    marginTop: ESPACIADO.sm,
    paddingTop: ESPACIADO.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  gananciaFooterTexto: { fontSize: FUENTE.tamanoXs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  // ─── Barras por mes ───────────────────────────────────────────────────────
  barrasScroll: { marginBottom: ESPACIADO.md, marginHorizontal: -ESPACIADO.md },
  barraCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.sm,
    alignItems: 'center',
    minWidth: 72,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
  },
  barraCardActual: { borderColor: COLORES.primario, backgroundColor: COLORES.primarioClaro },
  barraMes: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoSemibold, marginBottom: 4 },
  barraMesActual: { color: COLORES.primario },
  barraValor: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, marginBottom: 5 },
  barraIndicador: { width: 20, height: 3, borderRadius: 2 },

  // ─── Total histórico ──────────────────────────────────────────────────────
  totalHistCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  totalHistFila: { flexDirection: 'row', alignItems: 'center' },
  totalHistItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: ESPACIADO.xs },
  totalHistLabel: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, textAlign: 'center' },
  totalHistValor: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, textAlign: 'center' },
  totalHistSep: { width: 1, height: 40, backgroundColor: COLORES.borde },

  // ─── Sección títulos ──────────────────────────────────────────────────────
  seccionTituloFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACIADO.sm,
  },
  seccionTitulo: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginTop: ESPACIADO.xs,
    marginBottom: ESPACIADO.sm,
  },
  verTodos: { fontSize: FUENTE.tamanoPequeno, color: COLORES.primario, fontWeight: FUENTE.pesoSemibold },

  // ─── Tarjetas financieras ─────────────────────────────────────────────────
  gridDos: { flexDirection: 'row', gap: ESPACIADO.sm, marginBottom: ESPACIADO.sm },
  tarjeta: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tarjetaIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.sm,
  },
  tarjetaValor: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  tarjetaTitulo: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto, marginBottom: 1 },
  tarjetaSubtitulo: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario },

  // ─── Acciones rápidas ─────────────────────────────────────────────────────
  accionesGrid: { flexDirection: 'row', gap: ESPACIADO.sm, marginBottom: ESPACIADO.sm },
  accion: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  accionIconBox: {
    width: 50,
    height: 50,
    borderRadius: RADIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.sm,
  },
  accionTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 2 },
  accionDesc: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, textAlign: 'center' },

  // ─── Pedidos pendientes ───────────────────────────────────────────────────
  itemPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  pendIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ESPACIADO.sm,
  },
  pendInfo: { flex: 1 },
  pendPersona: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  pendFecha: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  pendDer: { alignItems: 'flex-end', gap: 3, marginRight: 2 },
  pendSaldo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.pendiente },

  // ─── Crédito desarrollador ────────────────────────────────────────────────
  creditoBox: {
    alignItems: 'center',
    paddingVertical: ESPACIADO.lg,
    paddingBottom: ESPACIADO.xl,
  },
  creditoTexto: {
    fontSize: 11,
    color: COLORES.textoDeshabilitado,
    letterSpacing: 0.3,
  },
});

export default Inicio;
