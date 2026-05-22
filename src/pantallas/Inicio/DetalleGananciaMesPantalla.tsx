import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { InicioStackParamList, TabParamList } from '../../navegacion/tipos';
import { useEstadisticas } from '../../hooks/useEstadisticas';
import { useWallet } from '../../contexto/WalletContext';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';
import { formatearMoneda } from '../../utilidades/formato';
import type { MesEstadistica } from '../../tipos';
import IndicadorWorkspaceHeader from '../../componentes/IndicadorWorkspaceHeader';
import { DesgloseMesContenido } from '../../componentes/DesgloseMesContenido';

type Props = NativeStackScreenProps<InicioStackParamList, 'DetalleGananciaMes'>;
type TabNav = BottomTabNavigationProp<TabParamList>;

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function fraccionSegura(valor: number, base: number): number {
  if (base <= 0) return 0;
  return Math.min(1, Math.max(0, valor / base));
}

function ordenarMesesCronologico(meses: MesEstadistica[]): MesEstadistica[] {
  return [...meses].sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    const ia = MESES_CORTO.indexOf(a.mes);
    const ib = MESES_CORTO.indexOf(b.mes);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

const DetalleGananciaMesPantalla: React.FC<Props> = ({ navigation }) => {
  const tabNavigation = useNavigation<TabNav>();
  const { width: winW } = useWindowDimensions();
  const chartWidth = useMemo(() => {
    const disponible = Math.max(0, winW - ESPACIADO.md * 2);
    return Math.min(disponible, 400);
  }, [winW]);
  const { walletSeleccionado, finanzasEpoch } = useWallet();
  const { estadisticas, cargando, error, cargar } = useEstadisticas();
  const [modalInfo, setModalInfo] = useState(false);

  /** Último mes de la serie = mes contable actual del backend (America/Guatemala), alineado con la tarjeta «Este mes» del inicio. */
  const gananciaMes =
    estadisticas?.porMes && estadisticas.porMes.length > 0
      ? estadisticas.porMes[estadisticas.porMes.length - 1]
      : undefined;

  const tituloPeriodo = (() => {
    if (gananciaMes) {
      const idx = MESES_CORTO.indexOf(gananciaMes.mes);
      const largo = idx >= 0 ? MESES_LARGO[idx] : gananciaMes.mes.toLowerCase();
      return `${largo} ${gananciaMes.anio}`;
    }
    const h = new Date();
    return `${MESES_LARGO[h.getMonth()]} ${h.getFullYear()}`;
  })();

  const tituloCabeceraNavegacion =
    gananciaMes != null
      ? tituloPeriodo.charAt(0).toLocaleUpperCase('es') + tituloPeriodo.slice(1)
      : 'Detalle del mes';

  const gananciaNetaMes = gananciaMes?.gananciaNeta ?? 0;
  const gananciaBruta = gananciaMes?.ganancia ?? 0;
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

  const esNetaPositiva = gananciaNetaMes >= 0;
  const ivaMes = gananciaMes?.impuestosIva ?? 0;

  const absP = Math.abs(netaMesPedidos);
  const absA = Math.abs(netaMesAsesorias);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: COLORES.tarjeta,
      backgroundGradientTo: COLORES.tarjeta,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
      labelColor: () => COLORES.textoSecundario,
      propsForDots: { r: '3', strokeWidth: '1', stroke: COLORES.primario },
      propsForBackgroundLines: { strokeDasharray: '', stroke: COLORES.borde, strokeWidth: 1 },
    }),
    [],
  );

  const pieData = useMemo(() => {
    const out: {
      name: string;
      population: number;
      color: string;
      legendFontColor: string;
      legendFontSize: number;
    }[] = [];
    if (absP > 0.005) {
      out.push({
        name: 'Pedidos',
        population: absP,
        color: COLORES.primario,
        legendFontColor: COLORES.textoSecundario,
        legendFontSize: 11,
      });
    }
    if (absA > 0.005) {
      out.push({
        name: 'Asesorías',
        population: absA,
        color: COLORES.morado,
        legendFontColor: COLORES.textoSecundario,
        legendFontSize: 11,
      });
    }
    return out;
  }, [absP, absA]);

  const tendenciaChart = useMemo(() => {
    const pm = estadisticas?.porMes;
    if (!pm?.length) return null;
    const ord = ordenarMesesCronologico(pm);
    const last = ord.slice(-6);
    if (last.length < 2) return null;
    return {
      labels: last.map((m) => (m.mes.length > 3 ? m.mes.slice(0, 3) : m.mes)),
      data: last.map((m) => (Number.isFinite(m.gananciaNeta) ? m.gananciaNeta : 0)),
    };
  }, [estadisticas?.porMes]);

  const baseBarrasFlujo = useMemo(() => {
    if (!gananciaMes) return 1;
    const ing = gananciaMes.ingresos;
    if (ing > 0.005) return ing;
    return Math.max(
      gananciaMes.costoVentas,
      gananciaBruta,
      gananciaMes.gastos,
      Math.abs(gananciaNetaMes),
      ivaMes,
      1,
    );
  }, [gananciaMes, gananciaBruta, gananciaNetaMes, ivaMes]);

  const mesCalendarioGanancia = useMemo(() => {
    if (!gananciaMes) return null;
    const idx = MESES_CORTO.indexOf(gananciaMes.mes);
    if (idx < 0) return null;
    return { anio: gananciaMes.anio, mes: idx + 1 };
  }, [gananciaMes]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tituloCabeceraNavegacion,
      headerBackTitle: '',
      headerRight: () => (
        <View style={estilosHeader.headerDerFila}>
          <IndicadorWorkspaceHeader compacto />
          <TouchableOpacity
            style={estilosHeader.btnAyudaCabecera}
            onPress={() => setModalInfo(true)}
            activeOpacity={0.85}
            accessibilityLabel="Ayuda: qué significa cada número"
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={20} color={COLORES.primarioOscuro} />
            <Text style={estilosHeader.btnAyudaCabeceraTxt}>Ayuda</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, tituloCabeceraNavegacion]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const irPedidos = () => {
    tabNavigation.navigate('PedidosTab', { screen: 'ListaPedidos' });
  };

  const irGastos = () => {
    const tabNav = navigation.getParent();
    tabNav?.navigate('GastosTab', { screen: 'ListaGastos' });
  };

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilos.safe} edges={['bottom']}>
        <Text style={estilos.errorTxt}>Seleccioná un workspace.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={estilos.periodoTitulo}>{tituloPeriodo}</Text>
        <Text style={estilos.pantallaKicker}>
          Mismo mes que la tarjeta «Este mes» del inicio (fechas en negocio).
        </Text>

        <TouchableOpacity
          style={estilos.btnModalAyuda}
          onPress={() => setModalInfo(true)}
          activeOpacity={0.85}
          accessibilityLabel="Qué significa cada número"
          accessibilityRole="button"
        >
          <Ionicons name="reader-outline" size={22} color={COLORES.primario} />
          <Text style={estilos.btnModalAyudaTxt}>Qué significa cada número</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORES.primarioOscuro} />
        </TouchableOpacity>

        {cargando && !estadisticas ? (
          <View style={estilos.cargandoBox}>
            <ActivityIndicator size="large" color={COLORES.primario} />
            <Text style={estilos.cargandoTxt}>Cargando estadísticas…</Text>
          </View>
        ) : error ? (
          <Text style={estilos.errorTxt}>{error}</Text>
        ) : !gananciaMes ? (
          <View style={estilos.avisoSuave}>
            <Ionicons name="analytics-outline" size={22} color={COLORES.textoSecundario} />
            <Text style={estilos.avisoTxt}>
              Todavía no hay datos para {tituloPeriodo}. Cuando haya cobros o gastos con fecha en este mes, el resumen
              aparece acá.
            </Text>
          </View>
        ) : (
          <>
            <View style={[estilos.hero, { backgroundColor: esNetaPositiva ? COLORES.primario : COLORES.peligro }]}>
              <Text style={estilos.heroEtiqueta}>Ganancia neta del mes</Text>
              <Text style={estilos.heroSub}>Lo que quedó después de costos y gastos del mes.</Text>
              <Text style={estilos.heroValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {esNetaPositiva ? '' : '−'}
                {formatearMoneda(Math.abs(gananciaNetaMes))}
              </Text>
            </View>

            {tendenciaChart && (
              <>
                <View style={estilos.seccionCab}>
                  <Text style={estilos.seccionTitulo}>Ganancia neta reciente</Text>
                  <Text style={estilos.seccionSub}>Últimos meses según fecha de cobro o gasto.</Text>
                </View>
                <View style={estilos.chartCard}>
                  <LineChart
                    data={{
                      labels: tendenciaChart.labels,
                      datasets: [{ data: tendenciaChart.data }],
                    }}
                    width={chartWidth}
                    height={158}
                    chartConfig={chartConfig}
                    bezier
                    style={estilos.chartInner}
                    withInnerLines
                    withOuterLines={false}
                    fromZero={false}
                    formatYLabel={(v) => {
                      const n = Number(v);
                      if (!Number.isFinite(n)) return '';
                      if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
                      return String(Math.round(n));
                    }}
                  />
                </View>
              </>
            )}

            <View style={estilos.seccionCab}>
              <Text style={estilos.seccionTitulo}>Origen de la ganancia neta</Text>
              <Text style={estilos.seccionSub}>Reparto entre pedidos y asesorías en este mes.</Text>
            </View>
            <View style={estilos.tarjetaVisual}>
              {pieData.length > 0 ? (
                <PieChart
                  data={pieData}
                  width={chartWidth}
                  height={178}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute={false}
                  hasLegend
                />
              ) : (
                <View style={estilos.chartPlaceholder}>
                  <Ionicons name="pie-chart-outline" size={28} color={COLORES.textoDeshabilitado} />
                  <Text style={estilos.chartPlaceholderTxt}>Sin reparto entre pedidos y asesorías este mes</Text>
                </View>
              )}
              <View style={estilos.filaDos}>
                <View style={estilos.tarjetaOrigen}>
                  <Text style={estilos.origenTitulo}>Pedidos</Text>
                  <Text style={estilos.origenMonto}>
                    {netaMesPedidos >= 0 ? '' : '−'}
                    {formatearMoneda(Math.abs(netaMesPedidos))}
                  </Text>
                  <Text style={estilos.origenDet}>{formatearMoneda(ingresosMesPedidos)} cobrados</Text>
                </View>
                <View style={estilos.tarjetaOrigen}>
                  <Text style={estilos.origenTitulo}>Asesorías</Text>
                  <Text style={estilos.origenMonto}>
                    {netaMesAsesorias >= 0 ? '' : '−'}
                    {formatearMoneda(Math.abs(netaMesAsesorias))}
                  </Text>
                  <Text style={estilos.origenDet}>{formatearMoneda(ingresosMesAsesorias)} cobrados</Text>
                </View>
              </View>
            </View>

            <View style={estilos.seccionCab}>
              <Text style={estilos.seccionTitulo}>Flujo del mes</Text>
              <Text style={estilos.seccionSub}>Del dinero que entró hasta el resultado.</Text>
            </View>
            <View style={estilos.tabla}>
              <BarraFlujo
                etiqueta="Ingresos cobrados"
                monto={gananciaMes.ingresos}
                fraccion={fraccionSegura(gananciaMes.ingresos, baseBarrasFlujo)}
                color={COLORES.exito}
              />
              <View style={estilos.tablaSep} />
              <BarraFlujo
                etiqueta="Costo de ventas"
                monto={gananciaMes.costoVentas}
                fraccion={fraccionSegura(gananciaMes.costoVentas, baseBarrasFlujo)}
                color={COLORES.advertencia}
                prefijo="−"
              />
              <View style={estilos.tablaSep} />
              <BarraFlujo
                etiqueta="Margen bruto"
                monto={gananciaBruta}
                fraccion={fraccionSegura(gananciaBruta, baseBarrasFlujo)}
                color={COLORES.primario}
              />
              <View style={estilos.tablaSep} />
              <BarraFlujo
                etiqueta="Gastos del mes"
                monto={gananciaMes.gastos}
                fraccion={fraccionSegura(gananciaMes.gastos, baseBarrasFlujo)}
                color={COLORES.peligro}
                prefijo="−"
              />
              {ivaMes > 0.005 && (
                <>
                  <View style={estilos.tablaSep} />
                  <BarraFlujo
                    etiqueta="IVA (informativo)"
                    monto={ivaMes}
                    fraccion={fraccionSegura(ivaMes, baseBarrasFlujo)}
                    color={COLORES.textoSecundario}
                  />
                </>
              )}
              <View style={estilos.tablaSepGruesa} />
              <BarraFlujo
                etiqueta="Ganancia neta"
                monto={Math.abs(gananciaNetaMes)}
                fraccion={fraccionSegura(Math.abs(gananciaNetaMes), baseBarrasFlujo)}
                color={gananciaNetaMes >= 0 ? COLORES.exito : COLORES.peligro}
                destacado
                prefijo={gananciaNetaMes >= 0 ? undefined : '−'}
              />
            </View>

            <View style={estilos.seccionCab}>
              <Text style={estilos.seccionTitulo}>Movimientos del mes</Text>
              <Text style={estilos.seccionSub}>Lista trazable de cobros y gastos del mes.</Text>
            </View>
            {walletSeleccionado && mesCalendarioGanancia ? (
              <DesgloseMesContenido
                walletId={walletSeleccionado.id}
                anio={mesCalendarioGanancia.anio}
                mes={mesCalendarioGanancia.mes}
                syncKey={String(finanzasEpoch)}
                mostrarIntro={false}
              />
            ) : null}

            <View style={estilos.seccionCab}>
              <Text style={estilos.seccionTitulo}>Ir a los datos</Text>
              <Text style={estilos.seccionSub}>Pedidos y gastos para registrar o revisar.</Text>
            </View>
            <TouchableOpacity style={estilos.btnAccion} onPress={irPedidos} activeOpacity={0.85}>
              <Ionicons name="cube-outline" size={22} color={COLORES.primario} />
              <View style={estilos.btnAccionTxt}>
                <Text style={estilos.btnAccionTitulo}>Pedidos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
            </TouchableOpacity>
            <TouchableOpacity style={[estilos.btnAccion, { marginTop: ESPACIADO.sm }]} onPress={irGastos} activeOpacity={0.85}>
              <Ionicons name="wallet-outline" size={22} color={COLORES.morado} />
              <View style={estilos.btnAccionTxt}>
                <Text style={estilos.btnAccionTitulo}>Gastos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal animationType="fade" transparent visible={modalInfo} onRequestClose={() => setModalInfo(false)}>
        <Pressable style={estilos.modalOverlay} onPress={() => setModalInfo(false)}>
          <Pressable style={estilos.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Conceptos del mes</Text>
              <TouchableOpacity onPress={() => setModalInfo(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORES.textoSecundario} />
              </TouchableOpacity>
            </View>
            <ScrollView style={estilos.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={estilos.modalPar}>
                <Text style={estilos.modalBold}>Ingresos cobrados: </Text>
                cobros del cliente en ventas, reparto del proveedor en intermediación, ingresos cliente→proveedor en venta sin cliente en la app, más asesorías marcadas pagadas en el mes; todo con fecha en el mes (zona Guatemala).
              </Text>
              <Text style={estilos.modalPar}>
                <Text style={estilos.modalBold}>Costo de ventas: </Text>
                costo de mercancía reconocido con esos cobros (prorrateado) más pagos a proveedor en compras registrados en el mes.
              </Text>
              <Text style={estilos.modalPar}>
                <Text style={estilos.modalBold}>Margen bruto: </Text>
                ingresos menos costo de ventas, antes de gastos generales.
              </Text>
              <Text style={estilos.modalPar}>
                <Text style={estilos.modalBold}>Gastos del mes: </Text>
                suma de gastos con fecha en este mes (se reparten entre pedidos y asesorías solo para la vista por origen;
                el total coincide con Inicio).
              </Text>
              <Text style={estilos.modalPar}>
                <Text style={estilos.modalBold}>IVA: </Text>
                informativo, prorrateado según cobros de ventas con impuesto en el mes más IVA de asesorías pagadas en el mes.
              </Text>
              <Text style={[estilos.modalPar, { marginBottom: 0 }]}>
                <Text style={estilos.modalBold}>Ganancia neta: </Text>
                margen bruto menos gastos del mes.
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

function BarraFlujo({
  etiqueta,
  monto,
  fraccion,
  color,
  destacado,
  prefijo,
}: {
  etiqueta: string;
  monto: number;
  fraccion: number;
  color: string;
  destacado?: boolean;
  prefijo?: string;
}) {
  const anchoPct = `${Math.round(fraccion * 1000) / 10}%` as `${number}%`;
  const signo = prefijo === '−' ? '−' : monto < 0 ? '−' : '';
  const abs = Math.abs(monto);
  return (
    <View style={[estilos.barraFlujoFila, destacado && estilos.barraFlujoFilaDest]}>
      <View style={estilos.barraFlujoCab}>
        <Text style={[estilos.barraFlujoEtiqueta, destacado && estilos.barraFlujoEtiquetaDest]} numberOfLines={2}>
          {etiqueta}
        </Text>
        <Text style={[estilos.barraFlujoMonto, destacado && estilos.barraFlujoMontoDest]}>
          {signo}
          {formatearMoneda(abs)}
        </Text>
      </View>
      <View style={estilos.barraFlujoTrack}>
        <View style={[estilos.barraFlujoFill, { width: anchoPct as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xxl },
  periodoTitulo: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    textTransform: 'capitalize',
    marginBottom: ESPACIADO.xs,
  },
  pantallaKicker: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 16,
    marginBottom: ESPACIADO.md,
  },
  btnModalAyuda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primarioClaro,
    paddingVertical: ESPACIADO.sm + 2,
    paddingHorizontal: ESPACIADO.md,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.28)',
    marginBottom: ESPACIADO.md,
  },
  btnModalAyudaTxt: {
    flex: 1,
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.primarioOscuro,
  },
  cargandoBox: {
    paddingVertical: ESPACIADO.xl,
    alignItems: 'center',
    gap: ESPACIADO.sm,
  },
  cargandoTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoSemibold },
  errorTxt: { color: COLORES.peligro, fontSize: FUENTE.tamanoBase, padding: ESPACIADO.md },
  avisoSuave: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.grisClaro,
    padding: ESPACIADO.md,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  avisoTxt: { flex: 1, fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, lineHeight: 20 },

  hero: {
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    marginBottom: ESPACIADO.lg,
  },
  heroEtiqueta: { color: 'rgba(255,255,255,0.9)', fontSize: FUENTE.tamanoPequeno, marginBottom: ESPACIADO.xs },
  heroSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FUENTE.tamanoXs,
    lineHeight: 16,
    marginBottom: ESPACIADO.sm,
  },
  heroValor: { color: COLORES.blanco, fontSize: 32, fontWeight: FUENTE.pesoBold, letterSpacing: -0.5 },

  seccionCab: { marginBottom: ESPACIADO.md },
  seccionTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  seccionSub: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 17,
  },

  tarjetaVisual: {
    marginBottom: ESPACIADO.lg,
  },
  chartCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: COLORES.borde,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.xs,
    marginBottom: ESPACIADO.lg,
    overflow: 'hidden',
    alignItems: 'center',
  },
  chartInner: {
    marginVertical: ESPACIADO.xs,
    borderRadius: RADIO.lg,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACIADO.xl,
    paddingHorizontal: ESPACIADO.md,
    backgroundColor: COLORES.grisClaro,
    borderRadius: RADIO.lg,
    marginBottom: ESPACIADO.sm,
    gap: ESPACIADO.sm,
  },
  chartPlaceholderTxt: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 20,
  },

  filaDos: { flexDirection: 'row', gap: ESPACIADO.sm },
  tarjetaOrigen: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  origenTitulo: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.textoSecundario, marginBottom: 6 },
  origenMonto: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 6 },
  origenDet: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, lineHeight: 16 },

  tabla: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  barraFlujoFila: { marginBottom: ESPACIADO.sm },
  barraFlujoFilaDest: { marginBottom: ESPACIADO.md },
  barraFlujoCab: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: ESPACIADO.sm,
    marginBottom: 8,
  },
  barraFlujoEtiqueta: {
    flex: 1,
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
  },
  barraFlujoEtiquetaDest: { fontSize: FUENTE.tamanoBase },
  barraFlujoMonto: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  barraFlujoMontoDest: { fontSize: FUENTE.tamanoGrande },
  barraFlujoTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORES.grisClaro,
    overflow: 'hidden',
  },
  barraFlujoFill: {
    height: '100%',
    borderRadius: 5,
  },
  tablaSep: { height: 1, backgroundColor: COLORES.borde, marginVertical: ESPACIADO.sm, marginLeft: 0 },
  tablaSepGruesa: { height: 2, backgroundColor: COLORES.bordeOscuro, marginVertical: ESPACIADO.sm, marginLeft: 0 },

  btnAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    backgroundColor: COLORES.tarjeta,
    padding: ESPACIADO.md,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  btnAccionTxt: { flex: 1, minWidth: 0 },
  btnAccionTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: ESPACIADO.lg,
  },
  modalCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    maxHeight: '78%',
    padding: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACIADO.sm,
  },
  modalTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, flex: 1 },
  modalScroll: { maxHeight: 400 },
  modalPar: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, lineHeight: 21, marginBottom: ESPACIADO.md },
  modalBold: { fontWeight: FUENTE.pesoBold, color: COLORES.texto },
});

/** Estilos solo para el grupo derecho del header (workspace + ayuda). */
const estilosHeader = StyleSheet.create({
  headerDerFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.xs,
    flexShrink: 1,
    paddingRight: ESPACIADO.sm,
    paddingLeft: ESPACIADO.xs,
  },
  btnAyudaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.28)',
  },
  btnAyudaCabeceraTxt: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.primarioOscuro,
  },
});

export default DetalleGananciaMesPantalla;
