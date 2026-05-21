import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { InicioStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { estadisticasServicio } from '../../servicios/estadisticas.servicio';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';
import { formatearMoneda } from '../../utilidades/formato';
import type { HistorialMesContableItem } from '../../tipos';

type Props = NativeStackScreenProps<InicioStackParamList, 'HistorialMesesAcumulado'>;

const HistorialMesesAcumuladoPantalla: React.FC<Props> = ({ navigation }) => {
  const { walletSeleccionado } = useWallet();
  const [meses, setMeses] = useState<HistorialMesContableItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mesesRecientesPrimero = useMemo(() => [...meses].reverse(), [meses]);

  const cargar = useCallback(async () => {
    const wid = walletSeleccionado?.id;
    if (!wid) return;
    setCargando(true);
    setError(null);
    try {
      const { meses: lista } = await estadisticasServicio.obtenerHistorialMeses(wid);
      setMeses(lista);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el historial');
      setMeses([]);
    } finally {
      setCargando(false);
    }
  }, [walletSeleccionado?.id]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilos.safe} edges={['bottom']}>
        <Text style={estilos.errorTxt}>Seleccioná un workspace.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.safe} edges={['bottom']}>
      <Text style={estilos.intro}>
        Cada fila es un mes con movimiento. Los totales históricos de Inicio son la suma de estos meses (misma lógica de
        caja e IVA que el resto de estadísticas).
      </Text>
      {cargando && meses.length === 0 ? (
        <View style={estilos.cargandoBox}>
          <ActivityIndicator size="large" color={COLORES.primario} />
        </View>
      ) : error ? (
        <Text style={estilos.errorTxt}>{error}</Text>
      ) : (
        <FlatList
          data={mesesRecientesPrimero}
          keyExtractor={(item) => `${item.anio}-${item.mes}`}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
          contentContainerStyle={mesesRecientesPrimero.length === 0 ? estilos.listaVacia : estilos.lista}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Ionicons name="calendar-outline" size={28} color={COLORES.textoSecundario} />
              <Text style={estilos.vacioTxt}>Todavía no hay meses con movimientos registrados.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const pos = item.gananciaNeta >= 0;
            return (
              <TouchableOpacity
                style={estilos.fila}
                onPress={() => navigation.navigate('DesgloseMes', { anio: item.anio, mes: item.mes })}
                activeOpacity={0.88}
              >
                <View style={estilos.filaIzq}>
                  <Text style={estilos.filaTitulo}>
                    {item.mesEtiqueta} {item.anio}
                  </Text>
                  <Text style={estilos.filaSub}>
                    Ingresos {formatearMoneda(item.ingresos)} · Gastos {formatearMoneda(item.gastos)}
                  </Text>
                </View>
                <View style={estilos.filaDer}>
                  <Text style={[estilos.filaNeta, { color: pos ? COLORES.pagado : COLORES.pendiente }]}>
                    {pos ? '' : '−'}
                    {formatearMoneda(Math.abs(item.gananciaNeta))}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORES.textoSecundario} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORES.fondo },
  intro: {
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.md,
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    lineHeight: 20,
  },
  cargandoBox: { paddingVertical: ESPACIADO.xl, alignItems: 'center' },
  errorTxt: { color: COLORES.peligro, fontSize: FUENTE.tamanoBase, padding: ESPACIADO.md },
  lista: { paddingHorizontal: ESPACIADO.md, paddingBottom: ESPACIADO.xl },
  listaVacia: { flexGrow: 1, justifyContent: 'center', padding: ESPACIADO.lg },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
  },
  filaIzq: { flex: 1, minWidth: 0 },
  filaTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  filaSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 4 },
  filaDer: { alignItems: 'flex-end', gap: 4 },
  filaNeta: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold },
  vacio: { alignItems: 'center', gap: ESPACIADO.sm, paddingVertical: ESPACIADO.xl },
  vacioTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default HistorialMesesAcumuladoPantalla;
