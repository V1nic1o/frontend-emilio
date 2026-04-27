import React, { useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { InicioStackParamList, TabParamList } from '../../navegacion/tipos';
import { useAsesoriasPendientes } from '../../hooks/useAsesorias';
import { useWallet } from '../../contexto/WalletContext';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda } from '../../utilidades/formato';
import EstadoBadge from '../../componentes/EstadoBadge';

type Props = NativeStackScreenProps<InicioStackParamList, 'AsesoriasPendientesCobro'>;
type TabNav = BottomTabNavigationProp<TabParamList>;

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function etiquetaPeriodo(anio: number, mes: number) {
  return `${MESES_CORTO[mes - 1] ?? mes} ${anio}`;
}

const AsesoriasPendientesCobroPantalla: React.FC<Props> = ({ navigation }) => {
  const tabNavigation = useNavigation<TabNav>();
  const { walletSeleccionado } = useWallet();
  const { pendientes, cargar, cargando } = useAsesoriasPendientes();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Asesorías por cobrar',
      headerBackTitle: '',
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const abrirAsesoria = useCallback(
    (personaId: number, personaNombre: string) => {
      tabNavigation.navigate('PersonasTab', {
        screen: 'AsesoriaMensual',
        params: { personaId, personaNombre },
      });
    },
    [tabNavigation],
  );

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
        <Text style={estilos.aviso}>Seleccioná un workspace para continuar.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <Text style={estilos.intro}>
        Elegí el cliente para abrir su asesoría mensual y registrar el cobro del periodo pendiente.
      </Text>
      <FlatList
        data={pendientes}
        keyExtractor={(item) => String(item.cobroId)}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        contentContainerStyle={pendientes.length === 0 ? estilos.listaVacia : estilos.lista}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={estilos.fila}
            onPress={() => abrirAsesoria(item.personaId, item.personaNombre)}
            activeOpacity={0.85}
          >
            <View style={estilos.iconoBox}>
              <Ionicons name="calendar-outline" size={22} color={COLORES.primario} />
            </View>
            <View style={estilos.info}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {item.personaNombre}
              </Text>
              <Text style={estilos.sub}>
                Asesoría · {etiquetaPeriodo(item.anio, item.mes)}
              </Text>
            </View>
            <View style={estilos.der}>
              <EstadoBadge estado="pendiente" />
              <Text style={estilos.monto}>{formatearMoneda(item.montoTotal)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !cargando ? (
            <View style={estilos.vacio}>
              <Ionicons name="checkmark-done-outline" size={40} color={COLORES.exito} />
              <Text style={estilos.vacioTitulo}>No hay asesorías pendientes</Text>
              <Text style={estilos.vacioTexto}>Cuando haya periodos sin cobrar, aparecerán aquí.</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  intro: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.md,
    lineHeight: 20,
  },
  lista: { paddingHorizontal: ESPACIADO.md, paddingBottom: ESPACIADO.xl },
  listaVacia: { flexGrow: 1, paddingHorizontal: ESPACIADO.md },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  iconoBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  nombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  sub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 3 },
  der: { alignItems: 'flex-end', gap: 4 },
  monto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ESPACIADO.xl * 2,
    paddingHorizontal: ESPACIADO.lg,
  },
  vacioTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginTop: ESPACIADO.md },
  vacioTexto: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center', marginTop: ESPACIADO.xs },
  aviso: { padding: ESPACIADO.md, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default AsesoriasPendientesCobroPantalla;
