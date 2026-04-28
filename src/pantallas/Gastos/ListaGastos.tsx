import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { GastosStackParamList } from '../../navegacion/tipos';
import { useGastos } from '../../hooks/useGastos';
import { Gasto } from '../../tipos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import FAB from '../../componentes/FAB';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { useWallet } from '../../contexto/WalletContext';
import { formatearMoneda, formatearFecha, esMesActual } from '../../utilidades/formato';
import { confirmarYEntonces, mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<GastosStackParamList, 'ListaGastos'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface CatConfig { color: string; fondo: string; icono: IoniconName }
const CATEGORIA_CONFIGS: Record<string, CatConfig> = {
  insumos:    { color: COLORES.primario, fondo: COLORES.primarioClaro, icono: 'cube-outline' },
  transporte: { color: '#0891B2', fondo: '#E0F2FE', icono: 'car-outline' },
  servicios:  { color: '#CA8A04', fondo: '#FEF9C3', icono: 'flash-outline' },
  alquiler:   { color: '#7C3AED', fondo: '#EDE9FE', icono: 'home-outline' },
  comida:     { color: '#EA580C', fondo: '#FFEDD5', icono: 'fast-food-outline' },
  personal:   { color: '#0F766E', fondo: '#CCFBF1', icono: 'person-outline' },
};

const getCatConfig = (cat?: string): CatConfig => {
  if (!cat) return { color: COLORES.advertencia, fondo: COLORES.advertenciaClaro, icono: 'cash-outline' };
  const key = cat.toLowerCase();
  return CATEGORIA_CONFIGS[key] ?? { color: COLORES.advertencia, fondo: COLORES.advertenciaClaro, icono: 'ellipsis-horizontal-circle-outline' };
};

const MES_NOMBRES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

interface Seccion { title: string; total: number; data: Gasto[] }

const ListaGastos: React.FC<Props> = ({ navigation }) => {
  const { walletSeleccionado } = useWallet();
  const fondoLista = walletSeleccionado?.tipo === 'personal' ? PERSONAL.fondo : COLORES.fondo;
  const { gastos, cargando, error, cargar, eliminar } = useGastos();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargar);
    return unsubscribe;
  }, [navigation, cargar]);

  const handleEliminar = useCallback(
    (gasto: Gasto) => {
      confirmarYEntonces(
        'Eliminar gasto',
        `¿Eliminar "${gasto.descripcion}"?`,
        { textoAceptar: 'Eliminar', destructivo: true },
        async () => {
          try {
            await eliminar(gasto.id);
          } catch (e: unknown) {
            mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      );
    },
    [eliminar],
  );

  const secciones: Seccion[] = useMemo(() => {
    const mapasMes: Record<string, { label: string; orden: number; items: Gasto[] }> = {};
    gastos.forEach((g) => {
      const d = new Date(g.fecha);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!mapasMes[key]) {
        const label = `${MES_NOMBRES[d.getMonth()].charAt(0).toUpperCase() + MES_NOMBRES[d.getMonth()].slice(1)} ${d.getFullYear()}`;
        mapasMes[key] = { label, orden: d.getFullYear() * 100 + d.getMonth(), items: [] };
      }
      mapasMes[key].items.push(g);
    });
    return Object.values(mapasMes)
      .sort((a, b) => b.orden - a.orden)
      .map((m) => ({
        title: m.label,
        total: m.items.reduce((acc, g) => acc + g.monto, 0),
        data: m.items,
      }));
  }, [gastos]);

  const totalMes = gastos.filter((g) => esMesActual(g.fecha)).reduce((acc, g) => acc + g.monto, 0);
  const cantMes = gastos.filter((g) => esMesActual(g.fecha)).length;

  const renderGasto = useCallback(
    ({ item }: { item: Gasto }) => {
      const cfg = getCatConfig(item.categoria);
      return (
        <View style={estilos.item}>
          <View style={[estilos.itemIcono, { backgroundColor: cfg.fondo }]}>
            <Ionicons name={cfg.icono} size={20} color={cfg.color} />
          </View>
          <View style={estilos.itemInfo}>
            <Text style={estilos.itemDescripcion}>{item.descripcion}</Text>
            <View style={estilos.itemMetaFila}>
              <Ionicons name="calendar-outline" size={11} color={COLORES.textoDeshabilitado} />
              <Text style={estilos.itemMeta}>{formatearFecha(item.fecha)}</Text>
              {item.categoria && (
                <>
                  <Text style={estilos.metaSep}>·</Text>
                  <View style={[estilos.catPill, { backgroundColor: cfg.fondo }]}>
                    <Text style={[estilos.catPillTexto, { color: cfg.color }]}>{item.categoria}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
          <View style={estilos.itemDer}>
            <Text style={estilos.itemMonto}>{formatearMoneda(item.monto)}</Text>
            <View style={estilos.itemAcciones}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditarGasto', { gastoId: item.id })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={estilos.accionBtn}
                accessibilityLabel="Editar gasto"
              >
                <Ionicons name="create-outline" size={14} color={COLORES.primario} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleEliminar(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={estilos.accionBtn}
                accessibilityLabel="Eliminar gasto"
              >
                <Ionicons name="trash-outline" size={14} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [handleEliminar, navigation]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Seccion }) => (
      <View style={estilos.seccionHeader}>
        <Text style={estilos.seccionTitulo}>{section.title}</Text>
        <Text style={estilos.seccionTotal}>{formatearMoneda(section.total)}</Text>
      </View>
    ),
    []
  );

  if (cargando && gastos.length === 0) return <CargandoSpinner />;
  if (error && gastos.length === 0) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: fondoLista }]} edges={['bottom']}>
      {/* Banner mes actual */}
      {gastos.length > 0 && (
        <View style={estilos.banner}>
          <View style={estilos.bannerLeft}>
            <View style={estilos.bannerIconBox}>
              <Ionicons name="wallet-outline" size={20} color={COLORES.advertencia} />
            </View>
            <View>
              <Text style={estilos.bannerLabel}>Gastos este mes</Text>
              <Text style={estilos.bannerSub}>{cantMes} movimiento{cantMes !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          <Text style={estilos.bannerMonto}>{formatearMoneda(totalMes)}</Text>
        </View>
      )}

      <SectionList
        sections={secciones}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGasto}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[estilos.lista, secciones.length === 0 && estilos.listaVacia]}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        ItemSeparatorComponent={() => <View style={{ height: ESPACIADO.sm }} />}
        SectionSeparatorComponent={() => <View style={{ height: ESPACIADO.xs }} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={estilos.vacioIconBox}>
              <Ionicons name="wallet-outline" size={40} color={COLORES.textoDeshabilitado} />
            </View>
            <Text style={estilos.vacioTitulo}>Sin gastos</Text>
            <Text style={estilos.vacioTexto}>Registrá tus gastos para llevar un control mensual</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => navigation.navigate('CrearGasto')} color={COLORES.advertencia} />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    paddingHorizontal: ESPACIADO.md,
    paddingVertical: ESPACIADO.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.advertenciaClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLabel: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  bannerSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 1 },
  bannerMonto: { fontSize: FUENTE.tamanoXl, fontWeight: FUENTE.pesoBold, color: COLORES.advertencia, letterSpacing: -0.5 },

  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ESPACIADO.xs,
    paddingTop: ESPACIADO.md,
    paddingBottom: ESPACIADO.xs,
  },
  seccionTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seccionTotal: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },

  lista: { padding: ESPACIADO.md, paddingBottom: 100 },
  listaVacia: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  itemIcono: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ESPACIADO.md,
  },
  itemInfo: { flex: 1 },
  itemDescripcion: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoMedio,
    color: COLORES.texto,
    marginBottom: 4,
  },
  itemMetaFila: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  itemMeta: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario },
  metaSep: { fontSize: FUENTE.tamanoXs, color: COLORES.textoDeshabilitado },
  catPill: {
    borderRadius: RADIO.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catPillTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold },
  itemDer: { alignItems: 'flex-end', gap: ESPACIADO.xs, marginLeft: ESPACIADO.sm },
  itemMonto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  itemAcciones: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACIADO.xl },
  vacioIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.md,
  },
  vacioTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: ESPACIADO.xs },
  vacioTexto: { fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default ListaGastos;
