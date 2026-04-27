import React, { useCallback, useLayoutEffect } from 'react';
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

const DetalleGananciaMesPantalla: React.FC<Props> = ({ navigation }) => {
  const tabNavigation = useNavigation<TabNav>();
  const { walletSeleccionado } = useWallet();
  const { estadisticas, cargando, error, cargar } = useEstadisticas();

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mesIdx = hoy.getMonth();
  const etiquetaMesCorto = MESES_CORTO[mesIdx] ?? '';
  const tituloPeriodo = `${MESES_LARGO[mesIdx] ?? ''} ${anio}`;

  const gananciaMes = estadisticas?.porMes.find((m) => m.anio === anio && m.mes === etiquetaMesCorto);

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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Detalle del mes',
      headerBackTitle: '',
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const irPedidos = () => {
    tabNavigation.navigate('PedidosTab', { screen: 'ListaPedidos' });
  };

  const irGastos = () => {
    const root = navigation.getParent()?.getParent() as unknown as
      | { navigate: (name: 'GastosStack', params: { screen: string }) => void }
      | undefined;
    root?.navigate('GastosStack', { screen: 'ListaGastos' });
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
        <Text style={estilos.periodoSub}>
          Mismos datos que la tarjeta «Este mes» en Inicio: ingresos de pedidos = cobros al cliente con fecha en este mes; costo prorrateado a lo cobrado.
        </Text>

        {cargando && !estadisticas ? (
          <View style={estilos.cargandoBox}>
            <ActivityIndicator size="large" color={COLORES.primario} />
          </View>
        ) : error ? (
          <Text style={estilos.errorTxt}>{error}</Text>
        ) : !gananciaMes ? (
          <View style={estilos.avisoSuave}>
            <Ionicons name="analytics-outline" size={22} color={COLORES.textoSecundario} />
            <Text style={estilos.avisoTxt}>
              Todavía no hay movimientos registrados para este mes en estadísticas. Cuando tengas cobros o gastos con
              fecha en {tituloPeriodo}, verás el resumen aquí.
            </Text>
          </View>
        ) : (
          <>
            <View style={[estilos.hero, { backgroundColor: esNetaPositiva ? COLORES.primario : COLORES.peligro }]}>
              <Text style={estilos.heroEtiqueta}>Ganancia neta del mes</Text>
              <Text style={estilos.heroValor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {esNetaPositiva ? '' : '−'}
                {formatearMoneda(Math.abs(gananciaNetaMes))}
              </Text>
            </View>

            <Text style={estilos.seccionTitulo}>Ganancia neta por origen</Text>
            <Text style={estilos.seccionSub}>
              Los gastos del mes se reparten entre pedidos y asesorías según el margen bruto de cada uno (solo para
              visualización; el total coincide con la tarjeta de Inicio).
            </Text>
            <View style={estilos.filaDos}>
              <View style={estilos.tarjetaOrigen}>
                <Text style={estilos.origenTitulo}>Pedidos</Text>
                <Text style={estilos.origenMonto}>
                  {netaMesPedidos >= 0 ? '' : '−'}
                  {formatearMoneda(Math.abs(netaMesPedidos))}
                </Text>
                <Text style={estilos.origenDet}>Ingresos cobrados (ventas): {formatearMoneda(ingresosMesPedidos)}</Text>
              </View>
              <View style={estilos.tarjetaOrigen}>
                <Text style={estilos.origenTitulo}>Asesorías</Text>
                <Text style={estilos.origenMonto}>
                  {netaMesAsesorias >= 0 ? '' : '−'}
                  {formatearMoneda(Math.abs(netaMesAsesorias))}
                </Text>
                <Text style={estilos.origenDet}>Ingresos cobrados: {formatearMoneda(ingresosMesAsesorias)}</Text>
              </View>
            </View>

            <Text style={estilos.seccionTitulo}>Cómo se calcula el mes</Text>
            <View style={estilos.tabla}>
              <FilaCalculo
                icono="trending-up-outline"
                etiqueta="Ingresos totales cobrados"
                monto={gananciaMes.ingresos}
                ayuda="Ventas cobradas en el mes + asesorías marcadas pagadas en el mes."
              />
              <View style={estilos.tablaSep} />
              <FilaCalculo
                icono="cube-outline"
                etiqueta="Costo de ventas"
                monto={gananciaMes.costoVentas}
                prefijo="menos"
                ayuda="Lo que pagaste por mercancía vendida (pedidos), en el mismo periodo."
              />
              <View style={estilos.tablaSep} />
              <FilaCalculo
                icono="layers-outline"
                etiqueta="Margen bruto (ganancia)"
                monto={gananciaBruta}
                destacado
                ayuda="Ingresos menos costo de ventas, antes de gastos generales."
              />
              <View style={estilos.tablaSep} />
              <FilaCalculo
                icono="receipt-outline"
                etiqueta="Gastos del mes"
                monto={gananciaMes.gastos}
                prefijo="menos"
                ayuda="Suma de gastos con fecha en este mes."
              />
              {ivaMes > 0.005 && (
                <>
                  <View style={estilos.tablaSep} />
                  <FilaCalculo
                    icono="pricetag-outline"
                    etiqueta="IVA (ventas con impuesto)"
                    monto={ivaMes}
                    ayuda="Impuesto asociado a ventas cobradas en el mes (informativo)."
                  />
                </>
              )}
              <View style={estilos.tablaSepGruesa} />
              <FilaCalculo
                icono="stats-chart-outline"
                etiqueta="Ganancia neta"
                monto={gananciaNetaMes}
                destacado
                ayuda="Margen bruto menos gastos del mes."
              />
            </View>

            <Text style={estilos.seccionTitulo}>¿Querés revisar los datos?</Text>
            <Text style={estilos.seccionSub}>
              La lista de pedidos y los gastos son donde se registran los movimientos que alimentan este resumen.
            </Text>
            <TouchableOpacity style={estilos.btnAccion} onPress={irPedidos} activeOpacity={0.85}>
              <Ionicons name="cube-outline" size={22} color={COLORES.primario} />
              <View style={estilos.btnAccionTxt}>
                <Text style={estilos.btnAccionTitulo}>Ir a pedidos</Text>
                <Text style={estilos.btnAccionSub}>Ventas, compras y cobros</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
            </TouchableOpacity>
            <TouchableOpacity style={[estilos.btnAccion, { marginTop: ESPACIADO.sm }]} onPress={irGastos} activeOpacity={0.85}>
              <Ionicons name="wallet-outline" size={22} color={COLORES.morado} />
              <View style={estilos.btnAccionTxt}>
                <Text style={estilos.btnAccionTitulo}>Ir a gastos</Text>
                <Text style={estilos.btnAccionSub}>Egresos del workspace</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

type Ion = React.ComponentProps<typeof Ionicons>['name'];

function FilaCalculo({
  icono,
  etiqueta,
  monto,
  ayuda,
  destacado,
  prefijo,
}: {
  icono: Ion;
  etiqueta: string;
  monto: number;
  ayuda: string;
  destacado?: boolean;
  /** Muestra el monto con signo menos (costos / gastos aunque el número sea positivo). */
  prefijo?: 'menos';
}) {
  const esMenos = prefijo === 'menos';
  const negativo = monto < 0;
  const signo = esMenos ? '−' : negativo ? '−' : '';
  const abs = Math.abs(monto);
  const colorValor =
    destacado && !esMenos ? (monto >= 0 ? COLORES.exito : COLORES.peligro) : COLORES.texto;
  return (
    <View style={estilos.filaCalc}>
      <Ionicons name={icono} size={20} color={COLORES.textoSecundario} style={{ marginTop: 2 }} />
      <View style={estilos.filaCalcTxt}>
        <Text style={[estilos.calcEtiqueta, destacado && estilos.calcEtiquetaDest]}>{etiqueta}</Text>
        <Text style={[estilos.calcValor, { color: colorValor }, destacado && estilos.calcValorDest]}>
          {signo}
          {formatearMoneda(abs)}
        </Text>
        <Text style={estilos.calcAyuda}>{ayuda}</Text>
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
  periodoSub: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, lineHeight: 20, marginBottom: ESPACIADO.lg },
  cargandoBox: { paddingVertical: ESPACIADO.xl, alignItems: 'center' },
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
  heroValor: { color: COLORES.blanco, fontSize: 32, fontWeight: FUENTE.pesoBold, letterSpacing: -0.5 },

  seccionTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: ESPACIADO.xs,
  },
  seccionSub: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, lineHeight: 20, marginBottom: ESPACIADO.md },

  filaDos: { flexDirection: 'row', gap: ESPACIADO.sm, marginBottom: ESPACIADO.lg },
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
  filaCalc: { flexDirection: 'row', gap: ESPACIADO.sm, alignItems: 'flex-start' },
  filaCalcTxt: { flex: 1, minWidth: 0 },
  calcEtiqueta: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  calcEtiquetaDest: { fontSize: FUENTE.tamanoMedio },
  calcValor: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, marginTop: 4 },
  calcValorDest: { fontSize: FUENTE.tamanoGrande },
  calcAyuda: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 6, lineHeight: 17 },
  tablaSep: { height: 1, backgroundColor: COLORES.borde, marginVertical: ESPACIADO.md, marginLeft: 28 },
  tablaSepGruesa: { height: 2, backgroundColor: COLORES.bordeOscuro, marginVertical: ESPACIADO.md, marginLeft: 0 },

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
  btnAccionSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
});

export default DetalleGananciaMesPantalla;
