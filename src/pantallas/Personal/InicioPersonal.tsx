import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexto/WalletContext';
import { finanzasPersonalesServicio } from '../../servicios/finanzasPersonales.servicio';
import { ResumenFinanzasPersonales } from '../../tipos';
import { esWalletPersonal } from '../../utilidades/wallet';
import { formatearMoneda } from '../../utilidades/formato';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';

type TabPersonal = 'IngresosPersonalTab' | 'GastosPersonalTab' | 'DeudasPersonalTab' | 'AhorrosPersonalTab';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface PasoSugerido {
  titulo: string;
  detalle: string;
  icono: IoniconName;
  tab: TabPersonal;
  pantalla?: string;
  color: string;
}

function usePanorama(resumen: ResumenFinanzasPersonales | null) {
  return useMemo(() => {
    if (!resumen) {
      return {
        pctGastoSobreIngreso: null as number | null,
        barraGastoPct: 0,
        etiquetaSalud: 'Sin datos del mes',
        saludOk: true,
        paso: null as PasoSugerido | null,
      };
    }
    const ing = resumen.totalIngresosMes;
    const gas = resumen.totalGastosMes;
    const bal = resumen.balanceMes;
    const deu = resumen.deudasPendientesTotal;

    const pctGastoSobreIngreso = ing > 0 ? Math.min(100, Math.round((gas / ing) * 100)) : gas > 0 ? 100 : 0;
    const barraGastoPct = ing > 0 ? Math.min(100, (gas / ing) * 100) : gas > 0 ? 100 : 0;

    let etiquetaSalud = 'Panorama al día';
    let saludOk = true;
    if (ing <= 0 && gas > 0) {
      etiquetaSalud = 'Falta contexto: sin ingresos';
      saludOk = false;
    } else if (bal < 0) {
      etiquetaSalud = 'Gastos por encima de ingresos';
      saludOk = false;
    } else if (pctGastoSobreIngreso >= 90) {
      etiquetaSalud = 'Poco margen este mes';
      saludOk = false;
    } else if (pctGastoSobreIngreso >= 70) {
      etiquetaSalud = 'Ojo con el ritmo de gasto';
      saludOk = true;
    }

    let paso: PasoSugerido | null = null;
    if (ing <= 0 && gas > 0) {
      paso = {
        titulo: 'Registrar ingresos',
        detalle: 'Tenés gastos del mes pero no ingresos registrados. Sumá lo que entró para ver el balance real.',
        icono: 'trending-up',
        tab: 'IngresosPersonalTab',
        pantalla: 'CrearIngresoPersonal',
        color: PERSONAL.accent,
      };
    } else if (bal < 0) {
      paso = {
        titulo: 'Revisá el detalle',
        detalle: 'El balance es negativo: conviene revisar gastos o sumar ingresos que falten. Podés editar cualquier movimiento con el lápiz.',
        icono: 'analytics',
        tab: 'GastosPersonalTab',
        color: COLORES.peligro,
      };
    } else if (deu > 0 && bal > 0 && pctGastoSobreIngreso < 85) {
      paso = {
        titulo: 'Podés abonar deudas',
        detalle: `Tenés ${formatearMoneda(bal)} de margen este mes y deudas pendientes. Un abono reduce lo que debés.`,
        icono: 'document-text',
        tab: 'DeudasPersonalTab',
        color: '#EA580C',
      };
    } else if (resumen.cantidadMetasAhorro === 0 && bal > 0) {
      paso = {
        titulo: 'Definí una meta de ahorro',
        detalle: 'Con margen positivo, una meta te ayuda a apartar plata con propósito.',
        icono: 'flag-outline',
        tab: 'AhorrosPersonalTab',
        pantalla: 'CrearAhorroPersonal',
        color: '#7C3AED',
      };
    } else if (gas === 0 && ing > 0) {
      paso = {
        titulo: 'Registrar gastos',
        detalle: 'Ya cargaste ingresos; sumá los gastos del mes para que el resumen sea completo.',
        icono: 'wallet-outline',
        tab: 'GastosPersonalTab',
        pantalla: 'CrearGasto',
        color: COLORES.morado,
      };
    }

    return { pctGastoSobreIngreso, barraGastoPct, etiquetaSalud, saludOk, paso };
  }, [resumen]);
}

const InicioPersonal: React.FC = () => {
  const { walletSeleccionado, volverAElegirWorkspace } = useWallet();
  const navigation = useNavigation<any>();
  const [resumen, setResumen] = useState<ResumenFinanzasPersonales | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!walletSeleccionado || !esWalletPersonal(walletSeleccionado)) return;
    setCargando(true);
    try {
      const r = await finanzasPersonalesServicio.resumen(walletSeleccionado.id);
      setResumen(r);
    } catch {
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const panorama = usePanorama(resumen);

  const navegarTab = useCallback(
    (tab: TabPersonal, pantalla?: string) => {
      const p = navigation.getParent();
      if (!p) return;
      if (pantalla) {
        p.navigate(tab, { screen: pantalla });
      } else {
        p.navigate(tab);
      }
    },
    [navigation],
  );

  const herramientas: {
    tab: TabPersonal;
    pantallaLista: string;
    titulo: string;
    subtitulo: string;
    icono: IoniconName;
    color: string;
    fondo: string;
  }[] = [
    {
      tab: 'IngresosPersonalTab',
      pantallaLista: 'ListaIngresosPersonales',
      titulo: 'Ingresos',
      subtitulo: 'Lo que entró este mes',
      icono: 'trending-up',
      color: PERSONAL.accentOscuro,
      fondo: PERSONAL.accentClaro,
    },
    {
      tab: 'GastosPersonalTab',
      pantallaLista: 'ListaGastos',
      titulo: 'Gastos',
      subtitulo: 'Salidas y categorías',
      icono: 'wallet',
      color: COLORES.morado,
      fondo: COLORES.moradoClaro,
    },
    {
      tab: 'DeudasPersonalTab',
      pantallaLista: 'ListaDeudasPersonales',
      titulo: 'Deudas',
      subtitulo: 'Abonos y pendiente',
      icono: 'document-text',
      color: '#C2410C',
      fondo: '#FFEDD5',
    },
    {
      tab: 'AhorrosPersonalTab',
      pantallaLista: 'ListaAhorrosPersonales',
      titulo: 'Ahorros',
      subtitulo: 'Metas y depósitos',
      icono: 'trophy-outline',
      color: '#6D28D9',
      fondo: '#EDE9FE',
    },
  ];

  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={PERSONAL.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.marca}>Tu espacio personal</Text>
            <Text style={estilos.walletNombre} numberOfLines={1}>
              {walletSeleccionado?.nombre ?? 'Wallet'}
            </Text>
          </View>
          <TouchableOpacity style={estilos.btnCambiar} onPress={volverAElegirWorkspace} activeOpacity={0.85}>
            <Ionicons name="swap-horizontal" size={18} color={PERSONAL.accentOscuro} />
            <Text style={estilos.btnCambiarTxt}>Workspace</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.hero}>
          <View style={estilos.heroBadge}>
            <Ionicons
              name={panorama.saludOk ? 'pulse' : 'warning'}
              size={14}
              color={PERSONAL.textoSobreOscuro}
            />
            <Text style={estilos.heroBadgeTxt}>{panorama.etiquetaSalud}</Text>
          </View>
          <Text style={estilos.heroEtiqueta}>Balance del mes</Text>
          {cargando && !resumen ? (
            <ActivityIndicator size="large" color={PERSONAL.textoSobreOscuro} style={{ marginVertical: ESPACIADO.md }} />
          ) : (
            <Text style={estilos.heroMonto}>
              {resumen ? formatearMoneda(resumen.balanceMes) : '—'}
            </Text>
          )}
          {resumen ? (
            <>
              <Text style={estilos.heroSub}>
                Ingresos {formatearMoneda(resumen.totalIngresosMes)} · Gastos {formatearMoneda(resumen.totalGastosMes)}
              </Text>
              <View style={estilos.barraTrack}>
                <View
                  style={[
                    estilos.barraFill,
                    {
                      width: `${panorama.barraGastoPct}%`,
                      backgroundColor: resumen.balanceMes < 0 ? COLORES.peligro : '#EA580C',
                    },
                  ]}
                />
              </View>
              <Text style={estilos.barraLeyenda}>
                {resumen.totalIngresosMes > 0
                  ? `Gastaste el ${panorama.pctGastoSobreIngreso}% de lo que registraste como ingreso`
                  : resumen.totalGastosMes > 0
                    ? 'Registrá ingresos para medir qué parte de tus entradas se va en gastos'
                    : 'Cuando cargues movimientos, aquí verás la relación ingreso / gasto'}
              </Text>
            </>
          ) : !cargando ? (
            <Text style={estilos.heroSub}>No pudimos cargar el resumen. Tirá hacia abajo para reintentar.</Text>
          ) : null}
        </View>

        {resumen ? (
          <View style={estilos.metricasFila}>
            <View style={estilos.metricaCaja}>
              <Ionicons name="arrow-down-circle" size={22} color={COLORES.peligro} />
              <Text style={estilos.metricaValor}>{formatearMoneda(resumen.totalGastosMes)}</Text>
              <Text style={estilos.metricaEt}>Gastos</Text>
            </View>
            <View style={estilos.metricaCaja}>
              <Ionicons name="layers-outline" size={22} color="#EA580C" />
              <Text style={estilos.metricaValor}>{formatearMoneda(resumen.deudasPendientesTotal)}</Text>
              <Text style={estilos.metricaEt}>Deuda pend.</Text>
            </View>
            <View style={estilos.metricaCaja}>
              <Ionicons name="trophy-outline" size={22} color="#7C3AED" />
              <Text style={estilos.metricaValor}>{formatearMoneda(resumen.totalAhorrado)}</Text>
              <Text style={estilos.metricaEt}>Ahorrado</Text>
            </View>
          </View>
        ) : null}

        {panorama.paso ? (
          <TouchableOpacity
            style={estilos.pasoCard}
            onPress={() => navegarTab(panorama.paso!.tab, panorama.paso!.pantalla)}
            activeOpacity={0.88}
          >
            <View style={[estilos.pasoIcono, { backgroundColor: `${panorama.paso.color}18` }]}>
              <Ionicons name={panorama.paso.icono} size={26} color={panorama.paso.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.pasoTit}>Te sugerimos</Text>
              <Text style={estilos.pasoNombre}>{panorama.paso.titulo}</Text>
              <Text style={estilos.pasoDet}>{panorama.paso.detalle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORES.textoDeshabilitado} />
          </TouchableOpacity>
        ) : null}

        <Text style={estilos.secTit}>Registrar en segundos</Text>
        <View style={estilos.accionesRapidas}>
          <TouchableOpacity
            style={estilos.chip}
            onPress={() => navegarTab('IngresosPersonalTab', 'CrearIngresoPersonal')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color={PERSONAL.accentOscuro} />
            <Text style={estilos.chipTxt}>Ingreso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.chip} onPress={() => navegarTab('GastosPersonalTab', 'CrearGasto')} activeOpacity={0.85}>
            <Ionicons name="remove-circle-outline" size={20} color={COLORES.morado} />
            <Text style={estilos.chipTxt}>Gasto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.chip}
            onPress={() => navegarTab('DeudasPersonalTab', 'CrearDeudaPersonal')}
            activeOpacity={0.85}
          >
            <Ionicons name="reader-outline" size={20} color="#C2410C" />
            <Text style={estilos.chipTxt}>Deuda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.chip}
            onPress={() => navegarTab('AhorrosPersonalTab', 'CrearAhorroPersonal')}
            activeOpacity={0.85}
          >
            <Ionicons name="flag-outline" size={20} color="#6D28D9" />
            <Text style={estilos.chipTxt}>Meta</Text>
          </TouchableOpacity>
        </View>

        <Text style={estilos.secTit}>Explorar</Text>
        {herramientas.map((h) => (
          <TouchableOpacity
            key={h.tab}
            style={estilos.toolRow}
            onPress={() => navegarTab(h.tab, h.pantallaLista)}
            activeOpacity={0.88}
          >
            <View style={[estilos.toolIcono, { backgroundColor: h.fondo }]}>
              <Ionicons name={h.icono} size={22} color={h.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.toolTit}>{h.titulo}</Text>
              <Text style={estilos.toolSub}>{h.subtitulo}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PERSONAL.fondo },
  scroll: { padding: ESPACIADO.lg, paddingBottom: 100 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ESPACIADO.md,
    gap: ESPACIADO.sm,
  },
  marca: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    color: PERSONAL.accentOscuro,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  walletNombre: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginTop: 2 },
  btnCambiar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIO.xl,
    backgroundColor: PERSONAL.tarjeta,
    borderWidth: 1,
    borderColor: PERSONAL.borde,
  },
  btnCambiarTxt: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: PERSONAL.accentOscuro },
  hero: {
    backgroundColor: PERSONAL.heroOscuro,
    borderRadius: RADIO.xxl,
    padding: ESPACIADO.lg,
    marginBottom: ESPACIADO.md,
    shadowColor: PERSONAL.heroOscuro,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIO.full,
    marginBottom: ESPACIADO.sm,
  },
  heroBadgeTxt: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoSemibold, color: PERSONAL.textoSobreOscuro },
  heroEtiqueta: { fontSize: FUENTE.tamanoPequeno, color: 'rgba(240,253,250,0.85)', marginBottom: 4 },
  heroMonto: {
    fontSize: FUENTE.tamanoXxl + 6,
    fontWeight: FUENTE.pesoBold,
    color: PERSONAL.textoSobreOscuro,
    letterSpacing: -1,
  },
  heroSub: { fontSize: FUENTE.tamanoXs, color: 'rgba(240,253,250,0.75)', marginTop: ESPACIADO.sm, lineHeight: 16 },
  barraTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: ESPACIADO.md,
    overflow: 'hidden',
  },
  barraFill: { height: '100%', borderRadius: 4 },
  barraLeyenda: { fontSize: 11, color: 'rgba(240,253,250,0.7)', marginTop: 8, lineHeight: 15 },
  metricasFila: { flexDirection: 'row', gap: ESPACIADO.sm, marginBottom: ESPACIADO.md },
  metricaCaja: {
    flex: 1,
    backgroundColor: PERSONAL.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PERSONAL.borde,
  },
  metricaValor: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginTop: 4 },
  metricaEt: { fontSize: 10, color: COLORES.textoSecundario, marginTop: 2, textAlign: 'center' },
  pasoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    backgroundColor: PERSONAL.tarjeta,
    padding: ESPACIADO.md,
    borderRadius: RADIO.xl,
    marginBottom: ESPACIADO.lg,
    borderWidth: 1,
    borderColor: PERSONAL.borde,
  },
  pasoIcono: {
    width: 52,
    height: 52,
    borderRadius: RADIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTit: { fontSize: 10, fontWeight: FUENTE.pesoBold, color: COLORES.textoSecundario, textTransform: 'uppercase' },
  pasoNombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginTop: 2 },
  pasoDet: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 4, lineHeight: 18 },
  secTit: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: PERSONAL.accentOscuro,
    marginBottom: ESPACIADO.sm,
  },
  accionesRapidas: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIADO.sm, marginBottom: ESPACIADO.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIO.full,
    backgroundColor: PERSONAL.tarjeta,
    borderWidth: 1,
    borderColor: PERSONAL.borde,
  },
  chipTxt: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    backgroundColor: PERSONAL.tarjeta,
    padding: ESPACIADO.md,
    borderRadius: RADIO.xl,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: PERSONAL.borde,
  },
  toolIcono: {
    width: 48,
    height: 48,
    borderRadius: RADIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTit: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  toolSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
});

export default InicioPersonal;
