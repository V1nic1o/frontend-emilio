import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexto/WalletContext';
import { estadisticasServicio } from '../../servicios/estadisticas.servicio';
import { finanzasPersonalesServicio } from '../../servicios/finanzasPersonales.servicio';
import { gastosServicio } from '../../servicios/gastos.servicio';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';
import { formatearMoneda } from '../../utilidades/formato';
import { esWalletPersonal } from '../../utilidades/wallet';
import {
  MESES_CORTO_RESUMEN,
  construirMesesPersonalEnRango,
  totalesPeriodoPersonal,
} from '../../utilidades/agrupacionMesFinanzas';
import type { EstadisticasRango, Gasto, IngresoPersonal, MesEstadistica } from '../../tipos';
import IndicadorWorkspaceHeader from '../../componentes/IndicadorWorkspaceHeader';
import { DesgloseMesContenido } from '../../componentes/DesgloseMesContenido';
import { CapaBlobsAtmosfera, estilosFondoAtmosfera } from '../../componentes/FondoAtmosfera';

type PresetPeriodo = 'este_mes' | 'personalizado';

type ModoGrafico = 'neta' | 'flujo';

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

const MAX_MESES_RANGO = 36;

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function primerDiaMes(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

function cantMesesEnRango(desde: Date, hasta: Date): number {
  const a = primerDiaMes(desde.getFullYear(), desde.getMonth());
  const b = primerDiaMes(hasta.getFullYear(), hasta.getMonth());
  if (a > b) return 0;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

function rangoDesdePreset(p: PresetPeriodo, hoy: Date, personalDesde: Date, personalHasta: Date): { desde: Date; hasta: Date } {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  if (p === 'personalizado') {
    return {
      desde: primerDiaMes(personalDesde.getFullYear(), personalDesde.getMonth()),
      hasta: primerDiaMes(personalHasta.getFullYear(), personalHasta.getMonth()),
    };
  }
  return { desde: primerDiaMes(y, m), hasta: primerDiaMes(y, m) };
}

function ordenarMesesEstadisticas(meses: MesEstadistica[]): MesEstadistica[] {
  return [...meses].sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    const ia = MESES_CORTO_RESUMEN.indexOf(a.mes as (typeof MESES_CORTO_RESUMEN)[number]);
    const ib = MESES_CORTO_RESUMEN.indexOf(b.mes as (typeof MESES_CORTO_RESUMEN)[number]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function mesCalendarioDesdeMesEstadistica(m: MesEstadistica): number {
  const i = MESES_CORTO_RESUMEN.indexOf(m.mes as (typeof MESES_CORTO_RESUMEN)[number]);
  return i >= 0 ? i + 1 : 1;
}

/**
 * react-native-chart-kit alinea cada valor con `labels[i]` y usa la longitud máxima de las series para el eje X.
 * Si hubiera más (o menos) puntos que etiquetas, el gráfico se deforma; recortamos/rellenamos con 0 de forma segura.
 */
function serieLineChartAlineada(valores: number[], nEtiquetas: number): number[] {
  const n = Math.max(0, nEtiquetas);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = valores[i];
    out.push(typeof v === 'number' && Number.isFinite(v) ? v : 0);
  }
  return out;
}

function etiquetaRango(desde: Date, hasta: Date): string {
  const i0 = desde.getMonth();
  const i1 = hasta.getMonth();
  const ml = (i: number) => MESES_LARGO[i] ?? '';
  if (desde.getTime() === hasta.getTime()) {
    return `${ml(i0)} ${desde.getFullYear()}`;
  }
  return `${ml(i0)} ${desde.getFullYear()} → ${ml(i1)} ${hasta.getFullYear()}`;
}

function soloDiaLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatearFechaCompletaModal(d: Date): string {
  const dia = d.getDate();
  const mes = MESES_CORTO_RESUMEN[d.getMonth()] ?? '';
  return `${dia} ${mes} ${d.getFullYear()}`;
}

/** Cabecera: «este mes» por mes; rango personalizado con día/mes/año elegidos en el calendario. */
function etiquetaPeriodoResumen(
  preset: PresetPeriodo,
  desdeAgg: Date,
  hastaAgg: Date,
  personalDesde: Date,
  personalHasta: Date,
): string {
  if (preset !== 'personalizado') {
    return etiquetaRango(desdeAgg, hastaAgg);
  }
  const a = soloDiaLocal(personalDesde).getTime();
  const b = soloDiaLocal(personalHasta).getTime();
  if (a === b) return formatearFechaCompletaModal(personalDesde);
  return `${formatearFechaCompletaModal(personalDesde)} → ${formatearFechaCompletaModal(personalHasta)}`;
}

function fechaToIsoYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoYMDAFechaLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return new Date();
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  return soloDiaLocal(new Date(y, mo, d));
}

type PropsInputFechaWeb = {
  value: Date;
  onChange: (d: Date) => void;
  min?: Date;
  max?: Date;
  accent: string;
};

/** En web el DateTimePicker no muestra UI; usamos el control nativo del navegador. */
function InputFechaWeb({ value, onChange, min, max, accent }: PropsInputFechaWeb) {
  return React.createElement('input', {
    type: 'date',
    'aria-label': 'Elegir fecha',
    value: fechaToIsoYMDLocal(value),
    min: min != null ? fechaToIsoYMDLocal(min) : undefined,
    max: max != null ? fechaToIsoYMDLocal(max) : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.currentTarget.value;
      if (v) onChange(isoYMDAFechaLocal(v));
    },
    style: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 12,
      border: `1.5px solid ${COLORES.borde}`,
      fontSize: FUENTE.tamanoBase,
      marginTop: 4,
      marginBottom: ESPACIADO.sm,
      boxSizing: 'border-box',
      accentColor: accent,
      backgroundColor: '#F8FAFC',
      color: COLORES.texto,
    } as React.CSSProperties,
  });
}

const ResumenPeriodoPantalla: React.FC = () => {
  const { width: winW } = useWindowDimensions();
  const navigation = useNavigation();
  const { walletSeleccionado, finanzasEpoch } = useWallet();
  const esPersonal = esWalletPersonal(walletSeleccionado);

  const hoy = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<PresetPeriodo>('este_mes');
  const [personalDesde, setPersonalDesde] = useState(() => soloDiaLocal(hoy));
  const [personalHasta, setPersonalHasta] = useState(() => soloDiaLocal(hoy));

  const [modalRango, setModalRango] = useState(false);
  const [draftDesde, setDraftDesde] = useState(() => soloDiaLocal(hoy));
  const [draftHasta, setDraftHasta] = useState(() => soloDiaLocal(hoy));
  const [errorRangoModal, setErrorRangoModal] = useState<string | null>(null);
  const [pickerActivo, setPickerActivo] = useState<'desde' | 'hasta' | null>(null);

  const [modoGrafico, setModoGrafico] = useState<ModoGrafico>('neta');

  const { desde, hasta } = useMemo(
    () => rangoDesdePreset(preset, hoy, personalDesde, personalHasta),
    [preset, hoy, personalDesde, personalHasta],
  );

  const mesesEnPeriodo = useMemo(() => cantMesesEnRango(desde, hasta), [desde, hasta]);

  const [ingresosP, setIngresosP] = useState<IngresoPersonal[]>([]);
  const [gastosP, setGastosP] = useState<Gasto[]>([]);
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  const [errorPersonal, setErrorPersonal] = useState<string | null>(null);

  const [rangoEmpresa, setRangoEmpresa] = useState<EstadisticasRango | null>(null);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(false);
  const [errorEmpresa, setErrorEmpresa] = useState<string | null>(null);

  const cargarPersonal = useCallback(async () => {
    const wid = walletSeleccionado?.id;
    if (!wid || !esPersonal) return;
    setCargandoPersonal(true);
    setErrorPersonal(null);
    try {
      const [ing, gas] = await Promise.all([
        finanzasPersonalesServicio.listarIngresos(wid),
        gastosServicio.listar(wid),
      ]);
      setIngresosP(ing);
      setGastosP(gas);
    } catch (e: unknown) {
      setErrorPersonal(e instanceof Error ? e.message : 'Error al cargar');
      setIngresosP([]);
      setGastosP([]);
    } finally {
      setCargandoPersonal(false);
    }
  }, [walletSeleccionado, esPersonal]);

  const cargarRangoEmpresa = useCallback(async () => {
    const wid = walletSeleccionado?.id;
    if (!wid || esPersonal) return;
    setCargandoEmpresa(true);
    setErrorEmpresa(null);
    try {
      const data = await estadisticasServicio.obtenerResumenRango(wid, toIsoLocal(desde), toIsoLocal(hasta));
      setRangoEmpresa(data);
    } catch (e: unknown) {
      setErrorEmpresa(e instanceof Error ? e.message : 'Error al cargar estadísticas');
      setRangoEmpresa(null);
    } finally {
      setCargandoEmpresa(false);
    }
  }, [walletSeleccionado, esPersonal, desde, hasta]);

  useFocusEffect(
    useCallback(() => {
      if (esPersonal) void cargarPersonal();
      else void cargarRangoEmpresa();
    }, [esPersonal, cargarPersonal, cargarRangoEmpresa]),
  );

  useEffect(() => {
    if (!esPersonal && walletSeleccionado?.id) void cargarRangoEmpresa();
  }, [finanzasEpoch, esPersonal, walletSeleccionado?.id, cargarRangoEmpresa]);

  const mesesEmpresaOrd = useMemo(
    () => ordenarMesesEstadisticas(rangoEmpresa?.porMes ?? []),
    [rangoEmpresa?.porMes],
  );

  const [mesExpandidoEmpresa, setMesExpandidoEmpresa] = useState<string | null>(null);

  const syncDesgloseEmpresa = useMemo(
    () => `${toIsoLocal(desde)}_${toIsoLocal(hasta)}_${finanzasEpoch}`,
    [desde, hasta, finanzasEpoch],
  );

  useEffect(() => {
    setMesExpandidoEmpresa(null);
  }, [desde, hasta, preset]);

  const mesesPersonalRango = useMemo(
    () => construirMesesPersonalEnRango(ingresosP, gastosP, desde, hasta),
    [ingresosP, gastosP, desde, hasta],
  );

  const totalesP = useMemo(() => totalesPeriodoPersonal(mesesPersonalRango), [mesesPersonalRango]);

  const totalesE = rangoEmpresa?.totales ?? null;

  const accent = esPersonal ? PERSONAL.accentOscuro : COLORES.primario;
  const kpiPrincipal = esPersonal ? totalesP.balance : (totalesE?.gananciaNeta ?? 0);
  const esKpiPositivoONeutro = kpiPrincipal >= 0;

  const chartLabels = useMemo(() => {
    if (esPersonal) {
      return mesesPersonalRango.map((x) => (x.mes.length > 3 ? x.mes.slice(0, 3) : x.mes));
    }
    return mesesEmpresaOrd.map((x) => (x.mes.length > 3 ? x.mes.slice(0, 3) : x.mes));
  }, [esPersonal, mesesPersonalRango, mesesEmpresaOrd]);

  const chartWidth = useMemo(() => {
    const disponible = Math.max(0, winW - ESPACIADO.md * 2 - ESPACIADO.lg * 2);
    const base = Math.min(disponible, 420);
    const n = chartLabels.length;
    if (n <= 6) return Math.max(base, 1);
    return Math.max(base, n * 46);
  }, [winW, chartLabels.length]);

  /** Ancho del BarChart de un mes: nunca mayor al ancho útil (evita overflow en móvil angosto). */
  const barChartWidthUnMes = useMemo(() => {
    const disponible = Math.max(0, winW - ESPACIADO.md * 2 - ESPACIADO.lg * 2);
    return Math.min(disponible, 400);
  }, [winW]);

  const lineDataNeta = useMemo(() => {
    const raw = esPersonal
      ? mesesPersonalRango.map((m) => (Number.isFinite(m.balance) ? m.balance : 0))
      : mesesEmpresaOrd.map((m) => (Number.isFinite(m.gananciaNeta) ? m.gananciaNeta : 0));
    return serieLineChartAlineada(raw, chartLabels.length);
  }, [esPersonal, mesesPersonalRango, mesesEmpresaOrd, chartLabels.length]);

  const lineDataIngresos = useMemo(() => {
    const raw = esPersonal
      ? mesesPersonalRango.map((m) => (Number.isFinite(m.ingresos) ? m.ingresos : 0))
      : mesesEmpresaOrd.map((m) => (Number.isFinite(m.ingresos) ? m.ingresos : 0));
    return serieLineChartAlineada(raw, chartLabels.length);
  }, [esPersonal, mesesPersonalRango, mesesEmpresaOrd, chartLabels.length]);

  const lineDataGastos = useMemo(() => {
    const raw = esPersonal
      ? mesesPersonalRango.map((m) => (Number.isFinite(m.gastos) ? m.gastos : 0))
      : mesesEmpresaOrd.map((m) => (Number.isFinite(m.gastos) ? m.gastos : 0));
    return serieLineChartAlineada(raw, chartLabels.length);
  }, [esPersonal, mesesPersonalRango, mesesEmpresaOrd, chartLabels.length]);

  /** Gráficos sobre fondo claro (tarjeta). */
  const chartConfigClaro = useMemo(
    () => ({
      backgroundGradientFrom: COLORES.tarjeta,
      backgroundGradientTo: COLORES.tarjeta,
      decimalPlaces: 0,
      color: (opacity = 1) =>
        esPersonal ? `rgba(13, 148, 136, ${opacity})` : `rgba(79, 70, 229, ${opacity})`,
      labelColor: () => COLORES.textoSecundario,
      propsForDots: { r: '4', strokeWidth: '2', stroke: accent },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: COLORES.borde,
        strokeWidth: 1,
      },
    }),
    [esPersonal, accent],
  );

  /** Modo Flujo: dos líneas con color propio; sin esto la librería pinta ambas sombras con `chartConfig.color`. */
  const chartConfigFlujo = useMemo(
    () => ({
      ...chartConfigClaro,
      useShadowColorFromDataset: true,
    }),
    [chartConfigClaro],
  );

  /** BarChart de un solo mes (valores encima de barras). */
  const chartConfigBarUnMes = useMemo(
    () => ({
      ...chartConfigClaro,
      barPercentage: 0.55,
      formatTopBarValue: (value: number) => {
        const v = Number(value);
        if (!Number.isFinite(v)) return '';
        if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
        if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
        return String(Math.round(v));
      },
    }),
    [chartConfigClaro],
  );

  const atmosphera = useMemo(
    () =>
      esPersonal
        ? {
            kpiIngresoBg: '#ECFEFF',
            kpiGastoBg: '#FFF1F2',
            kpiNeutroBg: '#F8FAFC',
          }
        : {
            kpiIngresoBg: '#EEF2FF',
            kpiGastoBg: '#FFF1F2',
            kpiNeutroBg: '#F8FAFC',
          },
    [esPersonal],
  );

  const haySerie = chartLabels.length >= 1;
  const hayMultiMes = chartLabels.length >= 2;

  const ingresosComp = esPersonal ? totalesP.ingresos : (totalesE?.ingresosCobrados ?? 0);
  const gastosComp = esPersonal ? totalesP.gastos : (totalesE?.gastosOperativos ?? 0);
  const totalComp = ingresosComp + gastosComp;
  const hayComposicion = totalComp > 0.005;

  const pieSlices = useMemo(() => {
    const out: {
      name: string;
      population: number;
      color: string;
      legendFontColor: string;
      legendFontSize: number;
    }[] = [];
    if (ingresosComp > 0.005) {
      out.push({
        name: 'Ingresos',
        population: ingresosComp,
        color: '#34D399',
        legendFontColor: '#94A3B8',
        legendFontSize: 12,
      });
    }
    if (gastosComp > 0.005) {
      out.push({
        name: 'Gastos',
        population: gastosComp,
        color: '#FB7185',
        legendFontColor: '#94A3B8',
        legendFontSize: 12,
      });
    }
    return out;
  }, [ingresosComp, gastosComp]);

  const pctIngresos = totalComp > 0.005 ? Math.round((ingresosComp / totalComp) * 1000) / 10 : 0;
  const pctGastos = totalComp > 0.005 ? Math.round((gastosComp / totalComp) * 1000) / 10 : 0;

  const pieWidth = Math.min(Math.max(winW - ESPACIADO.md * 2 - ESPACIADO.lg * 2, 260), 400);
  const pieChartMiniConfig = useMemo(
    () => ({
      backgroundGradientFrom: COLORES.tarjeta,
      backgroundGradientTo: COLORES.tarjeta,
      color: () => COLORES.textoSecundario,
    }),
    [],
  );

  const minFechaPicker = useMemo(() => new Date(hoy.getFullYear() - 25, 0, 1), [hoy]);
  const maxFechaPicker = useMemo(() => new Date(hoy.getFullYear() + 6, 11, 31), [hoy]);

  const maxFechaParaDesde = useMemo(() => {
    const t = draftHasta.getTime();
    const m = maxFechaPicker.getTime();
    return t > m ? maxFechaPicker : draftHasta;
  }, [draftHasta, maxFechaPicker]);

  const minFechaParaHasta = useMemo(() => {
    const t = draftDesde.getTime();
    const m = minFechaPicker.getTime();
    return t < m ? minFechaPicker : draftDesde;
  }, [draftDesde, minFechaPicker]);

  useEffect(() => {
    if (!modalRango) setPickerActivo(null);
  }, [modalRango]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: esPersonal ? 'Resumen · personal' : 'Resumen · negocio',
      headerRight: () => <IndicadorWorkspaceHeader compacto variantePersonal={esPersonal} />,
    });
  }, [navigation, esPersonal]);

  const refrescar = useCallback(() => {
    if (esPersonal) void cargarPersonal();
    else void cargarRangoEmpresa();
  }, [esPersonal, cargarPersonal, cargarRangoEmpresa]);

  const abrirModalPersonalizado = useCallback(() => {
    setDraftDesde(soloDiaLocal(personalDesde));
    setDraftHasta(soloDiaLocal(personalHasta));
    setErrorRangoModal(null);
    setPickerActivo(null);
    setModalRango(true);
  }, [personalDesde, personalHasta]);

  const aplicarModal = useCallback(() => {
    const d = soloDiaLocal(draftDesde);
    const h = soloDiaLocal(draftHasta);
    if (d.getTime() > h.getTime()) {
      setErrorRangoModal('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    const dMes = primerDiaMes(d.getFullYear(), d.getMonth());
    const hMes = primerDiaMes(h.getFullYear(), h.getMonth());
    const n = cantMesesEnRango(dMes, hMes);
    if (n > MAX_MESES_RANGO) {
      setErrorRangoModal(`Elige como máximo ${MAX_MESES_RANGO} meses.`);
      return;
    }
    setPersonalDesde(d);
    setPersonalHasta(h);
    setPreset('personalizado');
    setModalRango(false);
    setPickerActivo(null);
    setErrorRangoModal(null);
  }, [draftDesde, draftHasta]);

  const onCambioCalendario = useCallback((campo: 'desde' | 'hasta') => {
    return (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setPickerActivo(null);
        if (event.type !== 'set') return;
      }
      if (!date) return;
      const normalizada = soloDiaLocal(date);
      if (campo === 'desde') setDraftDesde(normalizada);
      else setDraftHasta(normalizada);
    };
  }, []);

  const cargando = esPersonal ? cargandoPersonal : cargandoEmpresa;
  const error = esPersonal ? errorPersonal : errorEmpresa;

  const heroTintBase = esKpiPositivoONeutro
    ? esPersonal
      ? PERSONAL.heroOscuro
      : '#4338CA'
    : '#B91C1C';

  const margenTxt =
    !esPersonal && totalesE?.margenSobreIngresosPct != null
      ? `${totalesE.margenSobreIngresosPct.toFixed(1)} %`
      : '—';

  return (
    <SafeAreaView style={estilosFondoAtmosfera.safeArea} edges={['bottom']}>
      <CapaBlobsAtmosfera esPersonal={esPersonal} />

      <ScrollView
        style={estilosFondoAtmosfera.contenidoDelante}
        contentContainerStyle={estilos.scroll}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={refrescar} tintColor={accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.workspaceRow}>
          <View style={[estilos.workspacePill, { borderColor: `${accent}44` }]}>
            <Ionicons name={esPersonal ? 'person' : 'business'} size={15} color={accent} />
            <Text style={[estilos.workspacePillTxt, { color: accent }]}>
              {esPersonal ? 'Personal' : 'Empresa'}
            </Text>
          </View>
        </View>

        <View style={estilos.periodShell}>
          <View style={[estilos.periodAccent, { backgroundColor: accent }]} />
          <View style={estilos.periodInner}>
            <Text style={estilos.periodTitulo}>
              {etiquetaPeriodoResumen(preset, desde, hasta, personalDesde, personalHasta)}
            </Text>
            <View style={[estilos.periodChip, { backgroundColor: esPersonal ? PERSONAL.accentClaro : COLORES.primarioClaro }]}>
              <Text style={[estilos.periodChipTxt, { color: accent }]}>{mesesEnPeriodo} meses</Text>
            </View>
          </View>
        </View>

        <Text style={estilos.pantallaKicker}>
          {esPersonal
            ? 'Elegí el período y mirá cómo entran y salen tus montos.'
            : 'Elegí un mes o un rango y compará ingreso, gasto y resultado.'}
        </Text>

        <View
          style={[
            estilos.modeSwitchOuter,
            {
              backgroundColor: esPersonal ? 'rgba(13, 148, 136, 0.08)' : 'rgba(79, 70, 229, 0.08)',
              borderColor: `${accent}26`,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              estilos.modeSwitchBtn,
              preset === 'este_mes' ? { backgroundColor: accent } : estilos.modeSwitchBtnIdle,
            ]}
            onPress={() => setPreset('este_mes')}
            accessibilityRole="button"
            accessibilityLabel="Periodo: este mes"
          >
            <Ionicons
              name="today"
              size={22}
              color={preset === 'este_mes' ? COLORES.blanco : accent}
            />
            <Text
              style={[
                estilos.modeSwitchLbl,
                preset === 'este_mes' ? estilos.modeSwitchLblOn : { color: COLORES.texto },
              ]}
            >
              Este mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              estilos.modeSwitchBtn,
              preset === 'personalizado' ? { backgroundColor: accent } : estilos.modeSwitchBtnIdle,
            ]}
            onPress={() => void abrirModalPersonalizado()}
            accessibilityRole="button"
            accessibilityLabel="Elegir rango de fechas"
          >
            <Ionicons
              name="git-branch-outline"
              size={22}
              color={preset === 'personalizado' ? COLORES.blanco : accent}
            />
            <Text
              style={[
                estilos.modeSwitchLbl,
                preset === 'personalizado' ? estilos.modeSwitchLblOn : { color: COLORES.texto },
              ]}
            >
              Rango
            </Text>
          </TouchableOpacity>
        </View>

        {mesesEnPeriodo > MAX_MESES_RANGO ? (
          <View style={estilos.aviso}>
            <Ionicons name="warning-outline" size={18} color={COLORES.peligro} />
            <Text style={estilos.avisoTxt}>Máx. {MAX_MESES_RANGO} meses.</Text>
          </View>
        ) : null}

        {cargando && !esPersonal && !rangoEmpresa ? (
          <View style={estilos.cargando}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={estilos.cargandoTxt}>Cargando resumen…</Text>
          </View>
        ) : cargando && esPersonal && ingresosP.length === 0 && gastosP.length === 0 ? (
          <View style={estilos.cargando}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={estilos.cargandoTxt}>Cargando resumen…</Text>
          </View>
        ) : error ? (
          <Text style={estilos.error}>{error}</Text>
        ) : (
          <>
            <View style={estilos.heroWrap}>
              <View style={[estilos.heroCard, { backgroundColor: heroTintBase }]}>
                <View style={estilos.heroOrb} />
                <Text style={estilos.heroKicker}>{esPersonal ? 'BALANCE' : 'GANANCIA NETA'}</Text>
                <Text style={estilos.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.42}>
                  {kpiPrincipal < 0 ? '−' : ''}
                  {formatearMoneda(Math.abs(kpiPrincipal))}
                </Text>
                <Text style={estilos.heroMicro} numberOfLines={2}>
                  {esPersonal
                    ? 'Balance = ingresos personales − gastos del período.'
                    : 'Resultado según cobros y gastos con fecha en el período elegido.'}
                </Text>
                <View style={estilos.heroPeriodFoot}>
                  <Ionicons name="calendar-outline" size={15} color="rgba(248,250,252,0.88)" />
                  <Text style={estilos.heroPeriodTxt}>
                    {etiquetaPeriodoResumen(preset, desde, hasta, personalDesde, personalHasta)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={estilos.kpiGrid}>
              <View style={[estilos.kpiTile, { backgroundColor: atmosphera.kpiIngresoBg }]}>
                <View style={estilos.kpiTileTop}>
                  <View style={[estilos.kpiIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Ionicons name="trending-up" size={18} color="#15803D" />
                  </View>
                </View>
                <Text style={estilos.kpiLab}>{esPersonal ? 'Ingresos' : 'Cobrado (caja)'}</Text>
                <Text style={estilos.kpiNum}>
                  {formatearMoneda(esPersonal ? totalesP.ingresos : (totalesE?.ingresosCobrados ?? 0))}
                </Text>
              </View>

              <View style={[estilos.kpiTile, { backgroundColor: atmosphera.kpiGastoBg }]}>
                <View style={estilos.kpiTileTop}>
                  <View style={[estilos.kpiIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.18)' }]}>
                    <Ionicons name="trending-down" size={18} color="#B91C1C" />
                  </View>
                </View>
                <Text style={estilos.kpiLab}>{esPersonal ? 'Gastos' : 'Operativo'}</Text>
                <Text style={estilos.kpiNum}>
                  {formatearMoneda(esPersonal ? totalesP.gastos : (totalesE?.gastosOperativos ?? 0))}
                </Text>
              </View>

              <View style={[estilos.kpiTile, { backgroundColor: atmosphera.kpiNeutroBg }]}>
                <View style={estilos.kpiTileTop}>
                  <View style={[estilos.kpiIconCircle, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]}>
                    <Ionicons name="pulse" size={18} color={accent} />
                  </View>
                </View>
                <Text style={estilos.kpiLab}>Promedio / mes</Text>
                <Text style={estilos.kpiNum}>
                  {formatearMoneda(
                    esPersonal ? totalesP.promedioMensualBalance : (totalesE?.promedioMensualGananciaNeta ?? 0),
                  )}
                </Text>
              </View>

              {esPersonal ? (
                <View style={[estilos.kpiTile, { backgroundColor: atmosphera.kpiNeutroBg }]}>
                  <View style={estilos.kpiTileTop}>
                    <View style={[estilos.kpiIconCircle, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
                      <Ionicons name="layers-outline" size={18} color={accent} />
                    </View>
                  </View>
                  <Text style={estilos.kpiLab}>Meses</Text>
                  <Text style={estilos.kpiNum}>{totalesP.mesesEnPeriodo}</Text>
                </View>
              ) : (
                <View style={[estilos.kpiTileWide, { backgroundColor: atmosphera.kpiNeutroBg }]}>
                  <View style={estilos.kpiDuo}>
                    <View style={estilos.kpiDuoHalf}>
                      <Text style={estilos.kpiLab}>Margen</Text>
                      <Text style={estilos.kpiNumSm}>{margenTxt}</Text>
                    </View>
                    <View style={estilos.kpiDuoSep} />
                    <View style={estilos.kpiDuoHalf}>
                      <Text style={estilos.kpiLab}>IVA</Text>
                      <Text style={estilos.kpiNumSm}>{formatearMoneda(totalesE?.impuestosIva ?? 0)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {!esPersonal && mesesEmpresaOrd.length > 0 && walletSeleccionado ? (
              <View style={estilos.desgloseShell}>
                <View style={estilos.desgloseHead}>
                  <View style={estilos.desgloseHeadRow}>
                    <Ionicons name="list-circle-outline" size={20} color={accent} />
                    <Text style={estilos.desgloseTitulo}>
                      {mesesEmpresaOrd.length === 1 ? 'Movimientos del mes' : 'Movimientos por mes'}
                    </Text>
                  </View>
                  <Text style={estilos.desgloseHint}>
                    {mesesEmpresaOrd.length === 1
                      ? 'Detalle trazable del mes incluido en el período.'
                      : 'Tocá un mes para expandir el detalle trazable.'}
                  </Text>
                </View>
                {mesesEmpresaOrd.length === 1 ? (
                  <DesgloseMesContenido
                    walletId={walletSeleccionado.id}
                    anio={mesesEmpresaOrd[0].anio}
                    mes={mesCalendarioDesdeMesEstadistica(mesesEmpresaOrd[0])}
                    syncKey={syncDesgloseEmpresa}
                    mostrarIntro
                  />
                ) : (
                  mesesEmpresaOrd.map((m, idx) => {
                    const mesNum = mesCalendarioDesdeMesEstadistica(m);
                    const clave = `${m.anio}-${mesNum}`;
                    const abierto = mesExpandidoEmpresa === clave;
                    const pos = m.gananciaNeta >= 0;
                    return (
                      <View key={`${m.anio}-${m.mes}-${idx}`}>
                        <TouchableOpacity
                          style={[estilos.desgloseFila, idx === 0 && estilos.desgloseFilaPrimera]}
                          onPress={() => setMesExpandidoEmpresa(abierto ? null : clave)}
                          activeOpacity={0.85}
                        >
                          <View style={estilos.desgloseFilaIzq}>
                            <Text style={estilos.desgloseFilaMes}>
                              {m.mes} {m.anio}
                            </Text>
                            <Text style={estilos.desgloseFilaSub}>
                              Ingresos {formatearMoneda(m.ingresos)} · Gastos {formatearMoneda(m.gastos)}
                            </Text>
                          </View>
                          <View style={estilos.desgloseFilaDer}>
                            <Text style={[estilos.desgloseFilaNeta, { color: pos ? COLORES.pagado : COLORES.pendiente }]}>
                              {pos ? '' : '−'}
                              {formatearMoneda(Math.abs(m.gananciaNeta))}
                            </Text>
                            <Ionicons
                              name={abierto ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={COLORES.textoSecundario}
                            />
                          </View>
                        </TouchableOpacity>
                        {abierto ? (
                          <View style={estilos.desgloseExpandBloque}>
                            <DesgloseMesContenido
                              walletId={walletSeleccionado.id}
                              anio={m.anio}
                              mes={mesNum}
                              syncKey={`${syncDesgloseEmpresa}-${clave}`}
                              mostrarIntro
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}

            <View style={estilos.graficoShell}>
              <View style={estilos.graficoShellHead}>
                <View style={estilos.graficoTituloCol}>
                  <View style={estilos.graficoTituloRow}>
                    <Ionicons name="pie-chart" size={18} color={accent} />
                    <Text style={estilos.graficoTitulo}>Composición</Text>
                  </View>
                  <Text style={estilos.graficoSubtitulo}>
                    {esPersonal
                      ? 'Cómo se reparten ingresos y gastos del período.'
                      : 'Ingresos cobrados vs gastos operativos en el período.'}
                  </Text>
                </View>
              </View>
              {hayComposicion && pieSlices.length > 0 ? (
                <>
                  <View style={estilos.pieWrap}>
                    <PieChart
                      data={pieSlices}
                      width={pieWidth}
                      height={208}
                      chartConfig={pieChartMiniConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="0"
                      absolute={false}
                      hasLegend={false}
                      avoidFalseZero
                      style={estilos.pieSvg}
                    />
                  </View>
                  <View style={estilos.pieLegend}>
                    {ingresosComp > 0.005 ? (
                      <View style={estilos.pieLegendRow}>
                        <View style={[estilos.pieLegendDot, { backgroundColor: '#34D399' }]} />
                        <Text style={estilos.pieLegendTxt}>
                          Ingresos · {pctIngresos}% · {formatearMoneda(ingresosComp)}
                        </Text>
                      </View>
                    ) : null}
                    {gastosComp > 0.005 ? (
                      <View style={estilos.pieLegendRow}>
                        <View style={[estilos.pieLegendDot, { backgroundColor: '#FB7185' }]} />
                        <Text style={estilos.pieLegendTxt}>
                          Gastos · {pctGastos}% · {formatearMoneda(gastosComp)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                <Text style={estilos.sinDatosGraf}>Sin datos para graficar en este período.</Text>
              )}
            </View>

            {haySerie ? (
              <View style={estilos.graficoShell}>
                  <View style={estilos.graficoShellHead}>
                  <View style={estilos.graficoTituloCol}>
                    <View style={estilos.graficoTituloRow}>
                      <Ionicons name="sparkles" size={18} color={accent} />
                      <Text style={estilos.graficoTitulo}>Serie</Text>
                    </View>
                    <Text style={estilos.graficoSubtitulo}>
                      {esPersonal
                        ? 'Evolución del balance mes a mes.'
                        : 'Evolución de ingresos, gastos y ganancia neta por mes.'}
                    </Text>
                  </View>
                  <View style={estilos.toggleLightRow}>
                    <TouchableOpacity
                      style={[estilos.toggleLightBtn, modoGrafico === 'neta' && estilos.toggleLightBtnOn]}
                      onPress={() => setModoGrafico('neta')}
                      activeOpacity={0.85}
                    >
                      <Text style={[estilos.toggleLightTxt, modoGrafico === 'neta' && estilos.toggleLightTxtOn]}>
                        {esPersonal ? 'Balance' : 'Neta'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[estilos.toggleLightBtn, modoGrafico === 'flujo' && estilos.toggleLightBtnOn]}
                      onPress={() => setModoGrafico('flujo')}
                      activeOpacity={0.85}
                    >
                      <Text style={[estilos.toggleLightTxt, modoGrafico === 'flujo' && estilos.toggleLightTxtOn]}>
                        Flujo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {modoGrafico === 'neta' && hayMultiMes ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: chartLabels,
                        datasets: [{ data: lineDataNeta }],
                      }}
                      width={chartWidth}
                      height={210}
                      chartConfig={chartConfigClaro}
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
                  </ScrollView>
                ) : modoGrafico === 'neta' && !hayMultiMes ? (
                  <>
                    <Text style={estilos.avisoUnMesSerie}>
                      Mostrás un solo mes: la tendencia en línea requiere 2 o más meses (elegí «Rango»). Abajo,{' '}
                      {esPersonal ? 'balance' : 'ganancia neta'} de ese mes.
                    </Text>
                    <BarChart
                      data={{
                        labels: [chartLabels[0] ?? '—'],
                        datasets: [{ data: [lineDataNeta[0] ?? 0] }],
                      }}
                      width={barChartWidthUnMes}
                      height={200}
                      yAxisLabel=""
                      yAxisSuffix=""
                      chartConfig={chartConfigBarUnMes}
                      style={{ ...estilos.chartInner, paddingRight: 24 }}
                      fromZero
                      showValuesOnTopOfBars
                      withInnerLines
                    />
                  </>
                ) : modoGrafico === 'flujo' && hayMultiMes ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <LineChart
                        data={{
                          labels: chartLabels,
                          datasets: [
                            { data: lineDataIngresos, color: () => '#34D399', strokeWidth: 2 },
                            { data: lineDataGastos, color: () => '#FB7185', strokeWidth: 2 },
                          ],
                          legend: ['In', 'Out'],
                        }}
                        width={chartWidth}
                        height={228}
                        chartConfig={chartConfigFlujo}
                        bezier
                        style={estilos.chartInner}
                        withInnerLines
                        withOuterLines={false}
                        fromZero
                        formatYLabel={(v) => {
                          const n = Number(v);
                          if (!Number.isFinite(n)) return '';
                          if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                          if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
                          return String(Math.round(n));
                        }}
                      />
                    </ScrollView>
                    <View style={estilos.leyendaFlujo}>
                      <View style={estilos.leyendaItem}>
                        <View style={[estilos.leyendaDot, { backgroundColor: '#34D399' }]} />
                        <Text style={estilos.leyendaTxtFlujo}>Ingresos</Text>
                      </View>
                      <View style={estilos.leyendaItem}>
                        <View style={[estilos.leyendaDot, { backgroundColor: '#FB7185' }]} />
                        <Text style={estilos.leyendaTxtFlujo}>Gastos</Text>
                      </View>
                    </View>
                  </>
                ) : modoGrafico === 'flujo' && !hayMultiMes ? (
                  <>
                    <Text style={estilos.avisoUnMesSerie}>
                      Un solo mes en el periodo: comparación ingresos vs gastos. Para evolución mes a mes usá «Rango» con varios meses.
                    </Text>
                    <BarChart
                      data={{
                        labels: ['Ingresos', 'Gastos'],
                        datasets: [
                          {
                            data: [lineDataIngresos[0] ?? 0, lineDataGastos[0] ?? 0],
                            colors: [
                              (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
                              (opacity = 1) => `rgba(251, 113, 133, ${opacity})`,
                            ],
                          },
                        ],
                      }}
                      width={barChartWidthUnMes}
                      height={216}
                      yAxisLabel=""
                      yAxisSuffix=""
                      chartConfig={{ ...chartConfigBarUnMes, barPercentage: 0.62 }}
                      style={{ ...estilos.chartInner, paddingRight: 16 }}
                      fromZero
                      showValuesOnTopOfBars
                      withInnerLines
                      withCustomBarColorFromData
                      flatColor
                    />
                    <View style={estilos.leyendaFlujo}>
                      <View style={estilos.leyendaItem}>
                        <View style={[estilos.leyendaDot, { backgroundColor: '#34D399' }]} />
                        <Text style={estilos.leyendaTxtFlujo}>Ingresos</Text>
                      </View>
                      <View style={estilos.leyendaItem}>
                        <View style={[estilos.leyendaDot, { backgroundColor: '#FB7185' }]} />
                        <Text style={estilos.leyendaTxtFlujo}>Gastos</Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <View style={estilos.avisoOscura}>
                <Ionicons name="analytics-outline" size={20} color="#64748B" />
                <Text style={estilos.avisoTxtOscuro}>Sin puntos en este rango.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalRango} transparent animationType="fade" onRequestClose={() => setModalRango(false)}>
        <Pressable style={estilos.modalOverlay} onPress={() => setModalRango(false)}>
          <Pressable style={estilos.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={[estilos.modalAccentBar, { backgroundColor: accent }]} />
            <View style={estilos.modalBody}>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={estilos.modalScroll}
              >
                <Text style={estilos.modalTitulo}>Periodo</Text>

                {Platform.OS === 'web' ? (
                  <>
                    <Text style={estilos.modalSub}>Desde</Text>
                    <InputFechaWeb
                      value={draftDesde}
                      onChange={(d) => setDraftDesde(d)}
                      min={minFechaPicker}
                      max={maxFechaParaDesde}
                      accent={accent}
                    />
                    <Text style={estilos.modalSubHasta}>Hasta</Text>
                    <InputFechaWeb
                      value={draftHasta}
                      onChange={(d) => setDraftHasta(d)}
                      min={minFechaParaHasta}
                      max={maxFechaPicker}
                      accent={accent}
                    />
                  </>
                ) : (
                  <>
                    <Text style={estilos.modalSub}>Desde</Text>
                    <TouchableOpacity
                      style={estilos.modalFechaBtn}
                      onPress={() => setPickerActivo((prev) => (prev === 'desde' ? null : 'desde'))}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Elegir fecha desde"
                    >
                      <Ionicons name="calendar-outline" size={22} color={accent} />
                      <Text style={estilos.modalFechaTxt}>{formatearFechaCompletaModal(draftDesde)}</Text>
                      <Ionicons name="chevron-down" size={18} color={COLORES.textoSecundario} />
                    </TouchableOpacity>
                    {pickerActivo === 'desde' ? (
                      <>
                        <DateTimePicker
                          value={draftDesde}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'inline' : 'default'}
                          onChange={onCambioCalendario('desde')}
                          minimumDate={minFechaPicker}
                          maximumDate={maxFechaParaDesde}
                          themeVariant="light"
                        />
                        {Platform.OS === 'ios' ? (
                          <TouchableOpacity style={estilos.modalListoIos} onPress={() => setPickerActivo(null)} activeOpacity={0.85}>
                            <Text style={[estilos.modalListoIosTxt, { color: accent }]}>Listo</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : null}

                    <Text style={estilos.modalSubHasta}>Hasta</Text>
                    <TouchableOpacity
                      style={estilos.modalFechaBtn}
                      onPress={() => setPickerActivo((prev) => (prev === 'hasta' ? null : 'hasta'))}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Elegir fecha hasta"
                    >
                      <Ionicons name="calendar-outline" size={22} color={accent} />
                      <Text style={estilos.modalFechaTxt}>{formatearFechaCompletaModal(draftHasta)}</Text>
                      <Ionicons name="chevron-down" size={18} color={COLORES.textoSecundario} />
                    </TouchableOpacity>
                    {pickerActivo === 'hasta' ? (
                      <>
                        <DateTimePicker
                          value={draftHasta}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'inline' : 'default'}
                          onChange={onCambioCalendario('hasta')}
                          minimumDate={minFechaParaHasta}
                          maximumDate={maxFechaPicker}
                          themeVariant="light"
                        />
                        {Platform.OS === 'ios' ? (
                          <TouchableOpacity style={estilos.modalListoIos} onPress={() => setPickerActivo(null)} activeOpacity={0.85}>
                            <Text style={[estilos.modalListoIosTxt, { color: accent }]}>Listo</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : null}
                  </>
                )}

                <Text style={estilos.modalAyudaCal}>
                  Los números del resumen se agrupan por mes calendario; elegís día, mes y año con precisión.
                </Text>

                {errorRangoModal ? <Text style={estilos.modalError}>{errorRangoModal}</Text> : null}
              </ScrollView>

              <View style={estilos.modalAcciones}>
                <TouchableOpacity style={estilos.modalBtnSec} onPress={() => setModalRango(false)}>
                  <Text style={estilos.modalBtnSecTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[estilos.modalBtnPri, { backgroundColor: accent }]} onPress={aplicarModal}>
                  <Text style={estilos.modalBtnPriTxt}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xxl },

  workspaceRow: { marginBottom: ESPACIADO.md },
  workspacePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: ESPACIADO.md,
    borderRadius: RADIO.full,
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  workspacePillTxt: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, letterSpacing: 0.4 },

  periodShell: {
    flexDirection: 'row',
    marginBottom: ESPACIADO.md,
    borderRadius: RADIO.xxl,
    backgroundColor: COLORES.tarjeta,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  periodAccent: { width: 5 },
  periodInner: {
    flex: 1,
    paddingVertical: ESPACIADO.lg,
    paddingRight: ESPACIADO.lg,
    paddingLeft: ESPACIADO.md,
  },
  periodTitulo: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  periodChip: {
    marginTop: ESPACIADO.sm,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIO.full,
  },
  periodChipTxt: { fontSize: 12, fontWeight: FUENTE.pesoBold, letterSpacing: 0.2 },

  pantallaKicker: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 17,
    marginBottom: ESPACIADO.md,
  },

  modeSwitchOuter: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: ESPACIADO.lg,
    padding: 5,
    borderRadius: RADIO.xxl,
    borderWidth: 1,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: ESPACIADO.sm,
    borderRadius: RADIO.xl,
  },
  modeSwitchBtnIdle: {
    backgroundColor: COLORES.tarjeta,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modeSwitchLbl: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoSemibold,
    letterSpacing: -0.2,
  },
  modeSwitchLblOn: {
    color: COLORES.blanco,
    fontWeight: FUENTE.pesoBold,
  },

  cargando: { paddingVertical: ESPACIADO.xl, alignItems: 'center', gap: ESPACIADO.sm },
  cargandoTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoSemibold },
  error: { color: COLORES.peligro, fontSize: FUENTE.tamanoBase, textAlign: 'center' },

  heroWrap: { marginBottom: ESPACIADO.lg },
  heroCard: {
    borderRadius: RADIO.xxl,
    paddingTop: ESPACIADO.lg,
    paddingBottom: ESPACIADO.lg,
    paddingHorizontal: ESPACIADO.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  heroOrb: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: FUENTE.pesoBold,
    color: 'rgba(248,250,252,0.78)',
    letterSpacing: 2.4,
    marginBottom: ESPACIADO.sm,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
    letterSpacing: -1,
  },
  heroMicro: {
    marginTop: ESPACIADO.sm,
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: 'rgba(248,250,252,0.86)',
    lineHeight: 17,
  },
  heroPeriodFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: ESPACIADO.md,
    paddingTop: ESPACIADO.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  heroPeriodTxt: {
    flex: 1,
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: 'rgba(248,250,252,0.92)',
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACIADO.sm,
    marginBottom: ESPACIADO.lg,
  },
  kpiTile: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    padding: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  kpiTileWide: {
    width: '100%',
    padding: ESPACIADO.md,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  kpiTileTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: ESPACIADO.sm },
  kpiIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLab: {
    fontSize: 11,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  kpiNum: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -0.2,
  },
  kpiNumSm: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  kpiDuo: { flexDirection: 'row', alignItems: 'stretch' },
  kpiDuoHalf: { flex: 1 },
  kpiDuoSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORES.borde,
    marginHorizontal: ESPACIADO.sm,
  },

  graficoShell: {
    borderRadius: RADIO.xxl,
    padding: ESPACIADO.lg,
    paddingBottom: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1,
    borderColor: COLORES.borde,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
  },
  graficoShellHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ESPACIADO.md,
    flexWrap: 'wrap',
    gap: ESPACIADO.sm,
  },
  graficoTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  graficoTituloCol: { flex: 1, minWidth: 0, gap: 4 },
  graficoTitulo: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -0.2,
  },
  graficoSubtitulo: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 16,
  },
  toggleLightRow: {
    flexDirection: 'row',
    borderRadius: RADIO.full,
    padding: 4,
    backgroundColor: COLORES.grisClaro,
    gap: 4,
  },
  toggleLightBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIO.full,
  },
  toggleLightBtnOn: {
    backgroundColor: COLORES.tarjeta,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleLightTxt: {
    fontSize: 12,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
  },
  toggleLightTxtOn: {
    color: COLORES.texto,
    fontWeight: FUENTE.pesoBold,
  },

  chartInner: { marginVertical: ESPACIADO.sm, alignSelf: 'flex-start' },
  pieWrap: { alignItems: 'center', justifyContent: 'center' },
  pieSvg: { marginVertical: ESPACIADO.xs },
  pieLegend: { gap: ESPACIADO.sm, paddingHorizontal: ESPACIADO.xs, paddingBottom: ESPACIADO.xs },
  pieLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pieLegendDot: { width: 11, height: 11, borderRadius: 6 },
  pieLegendTxt: {
    flex: 1,
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.texto,
    fontWeight: FUENTE.pesoSemibold,
  },
  leyendaFlujo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ESPACIADO.lg,
    marginTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.xs,
  },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5 },
  leyendaTxtFlujo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoSemibold },

  sinDatosGraf: {
    fontSize: 13,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    paddingVertical: ESPACIADO.lg,
    fontWeight: FUENTE.pesoSemibold,
  },

  avisoUnMesSerie: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: ESPACIADO.sm,
    paddingBottom: ESPACIADO.sm,
    fontWeight: FUENTE.pesoSemibold,
  },

  aviso: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    alignItems: 'center',
    marginBottom: ESPACIADO.md,
    padding: ESPACIADO.md,
    backgroundColor: COLORES.peligroClaro,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  avisoTxt: { flex: 1, fontSize: FUENTE.tamanoPequeno, color: COLORES.peligro, fontWeight: FUENTE.pesoSemibold },
  avisoOscura: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ESPACIADO.lg,
    marginBottom: ESPACIADO.md,
    borderRadius: RADIO.xl,
    backgroundColor: '#E2E8F0',
  },
  avisoTxtOscuro: { fontSize: FUENTE.tamanoPequeno, color: '#475569', fontWeight: FUENTE.pesoSemibold },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: ESPACIADO.lg,
  },
  modalCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 16,
  },
  modalAccentBar: { height: 4, width: '100%' },
  modalBody: {
    paddingHorizontal: ESPACIADO.lg,
    paddingTop: ESPACIADO.lg,
    paddingBottom: ESPACIADO.sm,
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalFechaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.md,
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    backgroundColor: '#F8FAFC',
    marginBottom: ESPACIADO.xs,
  },
  modalFechaTxt: {
    flex: 1,
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
  },
  modalListoIos: {
    alignSelf: 'flex-end',
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
  },
  modalListoIosTxt: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
  },
  modalAyudaCal: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: ESPACIADO.md,
    lineHeight: 16,
  },
  modalTitulo: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.md,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 11,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    letterSpacing: 1,
    marginBottom: ESPACIADO.sm,
    marginTop: ESPACIADO.sm,
    textTransform: 'uppercase',
  },
  modalSubHasta: {
    fontSize: 11,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    letterSpacing: 1,
    marginBottom: ESPACIADO.sm,
    marginTop: ESPACIADO.lg,
    textTransform: 'uppercase',
  },
  modalError: { color: COLORES.peligro, fontSize: FUENTE.tamanoPequeno, marginTop: ESPACIADO.sm, fontWeight: FUENTE.pesoSemibold },
  modalAcciones: { flexDirection: 'row', gap: ESPACIADO.sm, marginTop: ESPACIADO.sm },
  modalBtnSec: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    backgroundColor: '#F8FAFC',
  },
  modalBtnSecTxt: { fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoBold },
  modalBtnPri: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: RADIO.lg },
  modalBtnPriTxt: { fontSize: FUENTE.tamanoBase, color: COLORES.blanco, fontWeight: FUENTE.pesoBold },

  desgloseShell: {
    marginBottom: ESPACIADO.lg,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: ESPACIADO.md,
  },
  desgloseHead: { marginBottom: ESPACIADO.sm },
  desgloseHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  desgloseTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto, flex: 1 },
  desgloseHint: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 16,
    marginTop: ESPACIADO.xs,
    paddingLeft: 28,
  },
  desgloseFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIADO.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  desgloseFilaPrimera: { borderTopWidth: 0 },
  desgloseFilaIzq: { flex: 1, minWidth: 0 },
  desgloseFilaMes: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  desgloseFilaSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  desgloseFilaDer: { alignItems: 'flex-end', gap: 2 },
  desgloseFilaNeta: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold },
  desgloseExpandBloque: {
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.xs,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
});

export default ResumenPeriodoPantalla;
