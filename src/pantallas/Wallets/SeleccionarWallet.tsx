import React, { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { WalletStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { Wallet } from '../../tipos';
import { walletsServicio } from '../../servicios/wallets.servicio';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';
import { esWalletPersonal, tipoWalletEtiqueta } from '../../utilidades/wallet';
import { confirmarYEntonces, mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<WalletStackParamList, 'SeleccionarWallet'>;

const COL_GAP = ESPACIADO.sm;
const PADDING = ESPACIADO.md;

const getIniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const SeleccionarWallet: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const cardWidth = useMemo(() => (width - PADDING * 2 - COL_GAP) / 2, [width]);
  const { wallets, seleccionar, recargarWallets, cargando } = useWallet();

  useFocusEffect(
    useCallback(() => {
      recargarWallets();
    }, [recargarWallets]),
  );

  const handleEliminar = (wallet: Wallet) => {
    confirmarYEntonces(
      `Eliminar "${wallet.nombre}"`,
      wallet.tipo === 'personal'
        ? 'Se eliminarán ingresos, gastos, deudas y metas de ahorro de este espacio. Esta acción no se puede deshacer.'
        : 'Se eliminarán personas, pedidos, catálogo y gastos de este espacio. Esta acción no se puede deshacer.',
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await walletsServicio.eliminar(wallet.id);
          await recargarWallets();
        } catch {
          mostrarAlerta('Error', 'No se pudo eliminar el workspace');
        }
      },
    );
  };

  const filas = useMemo(() => {
    const out: (Wallet | null)[][] = [];
    for (let i = 0; i < wallets.length; i += 2) {
      out.push([wallets[i], wallets[i + 1] ?? null]);
    }
    return out;
  }, [wallets]);

  if (cargando) return <CargandoSpinner />;

  return (
    <SafeAreaView style={estilos.contenedor}>
      {/* Header */}
      <View style={estilos.header}>
        <Text style={estilos.titulo}>Mis Workspaces</Text>
        <Text style={estilos.subtitulo}>Seleccioná con cuál trabajar hoy</Text>
        <Text style={estilos.desc}>
          Podés tener espacios de empresa (pedidos y catálogo) o personales (ingresos, gastos, deudas y ahorros). Cada uno es independiente.
        </Text>
      </View>

      <FlatList
        data={filas.length > 0 ? filas : [null]}
        keyExtractor={(_, i) => String(i)}
        extraData={width}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: COL_GAP }} />}
        ListEmptyComponent={null}
        renderItem={({ item: fila }) => {
          if (fila === null) {
            // Estado vacío
            return (
              <View style={estilos.vacio}>
                <View style={estilos.vacioIconBox}>
                  <Ionicons name="briefcase-outline" size={44} color={COLORES.textoDeshabilitado} />
                </View>
                <Text style={estilos.vacioTitulo}>Sin workspaces aún</Text>
                <Text style={estilos.vacioDesc}>
                  Creá tu primer workspace para empezar a gestionar clientes y pedidos.
                </Text>
              </View>
            );
          }
          return (
            <View style={estilos.fila}>
              {(fila as (Wallet | null)[]).map((item, idx) => {
                if (!item) return <View key={`empty-${idx}`} style={{ width: cardWidth }} />;
                const iniciales = getIniciales(item.nombre);
                const personal = esWalletPersonal(item);
                const fondoMedio = hexToRgba(item.color, 0.18);
                const acentoTipo = personal ? PERSONAL.accentOscuro : COLORES.primario;
                const fondoTopTipo = personal ? PERSONAL.accentClaro : COLORES.primarioClaro;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      estilos.card,
                      personal ? estilos.cardMarcoPersonal : estilos.cardMarcoEmpresa,
                      { width: cardWidth },
                    ]}
                    onPress={() => seleccionar(item)}
                    onLongPress={() => handleEliminar(item)}
                    activeOpacity={0.88}
                  >
                    <View style={[estilos.cardTop, { backgroundColor: fondoTopTipo }]}>
                      <View style={[estilos.marcaAguaIcono, personal ? estilos.marcaAguaPersonal : estilos.marcaAguaEmpresa]}>
                        <Ionicons
                          name={personal ? 'wallet-outline' : 'business'}
                          size={56}
                          color={personal ? 'rgba(13,148,136,0.12)' : 'rgba(79,70,229,0.1)'}
                        />
                      </View>
                      <View style={[estilos.avatarCircle, { backgroundColor: item.color }]}>
                        <Text style={estilos.avatarTexto}>{iniciales || '?'}</Text>
                      </View>
                      <View style={[estilos.tipoRibbon, personal ? estilos.tipoRibbonPersonal : estilos.tipoRibbonEmpresa]}>
                        <Ionicons
                          name={personal ? 'person-outline' : 'briefcase-outline'}
                          size={11}
                          color={personal ? PERSONAL.accentOscuro : COLORES.primario}
                        />
                        <Text style={[estilos.tipoRibbonTxt, { color: acentoTipo }]}>{tipoWalletEtiqueta(item.tipo)}</Text>
                      </View>
                      <View style={[estilos.dotDeco, { backgroundColor: fondoMedio }]} />
                    </View>

                    <View style={[estilos.cardBody, personal ? estilos.cardBodyPersonal : estilos.cardBodyEmpresa]}>
                      <Text style={estilos.cardNombre} numberOfLines={2}>{item.nombre}</Text>
                      <Text style={estilos.cardRol} numberOfLines={1}>
                        {personal ? 'Finanzas e ingresos propios' : 'Pedidos, personas y catálogo'}
                      </Text>
                      {item.descripcion ? (
                        <Text style={estilos.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
                      ) : null}
                      <View style={[estilos.entrarRow, { marginTop: item.descripcion ? ESPACIADO.xs : ESPACIADO.sm }]}>
                        <Text style={[estilos.entrarTexto, { color: acentoTipo }]}>Abrir</Text>
                        <Ionicons name="arrow-forward" size={12} color={acentoTipo} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
      />

      {/* Footer */}
      <View style={estilos.footer}>
        <TouchableOpacity
          style={estilos.botonCrear}
          onPress={() => navigation.navigate('CrearWallet')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color={COLORES.blanco} />
          <Text style={estilos.botonCrearTexto}>Nuevo Workspace</Text>
        </TouchableOpacity>
        {wallets.length > 0 && (
          <Text style={estilos.ayuda}>Mantené presionado para eliminar</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },

  header: {
    paddingHorizontal: ESPACIADO.lg,
    paddingTop: ESPACIADO.lg,
    paddingBottom: ESPACIADO.md,
  },
  titulo: {
    fontSize: 26,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.xs,
  },
  desc: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoDeshabilitado,
    lineHeight: 17,
    marginTop: 2,
  },

  lista: {
    paddingHorizontal: PADDING,
    paddingTop: ESPACIADO.xs,
    paddingBottom: ESPACIADO.xxl,
  },

  fila: {
    flexDirection: 'row',
    gap: COL_GAP,
  },

  card: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardMarcoEmpresa: {
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderTopWidth: 3,
    borderTopColor: COLORES.primario,
  },
  cardMarcoPersonal: {
    borderWidth: 1,
    borderColor: PERSONAL.borde,
    borderTopWidth: 3,
    borderTopColor: PERSONAL.accent,
  },
  cardTop: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  marcaAguaIcono: {
    position: 'absolute',
    alignSelf: 'center',
    top: 6,
    opacity: 1,
  },
  marcaAguaEmpresa: { transform: [{ translateX: 28 }, { translateY: 4 }] },
  marcaAguaPersonal: { transform: [{ translateX: 26 }, { translateY: 6 }] },
  tipoRibbon: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIO.full,
  },
  tipoRibbonEmpresa: { backgroundColor: 'rgba(255,255,255,0.92)' },
  tipoRibbonPersonal: { backgroundColor: 'rgba(255,255,255,0.92)' },
  tipoRibbonTxt: { fontSize: 10, fontWeight: FUENTE.pesoBold },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarTexto: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: '#fff',
    letterSpacing: 1,
  },
  dotDeco: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  cardBody: {
    padding: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
  },
  cardBodyEmpresa: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
  },
  cardBodyPersonal: {
    borderTopWidth: 1,
    borderTopColor: PERSONAL.accentClaro,
  },
  cardRol: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.xs,
    lineHeight: 16,
  },
  cardNombre: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: 3,
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 16,
  },
  entrarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  entrarTexto: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
  },

  vacio: {
    alignItems: 'center',
    paddingVertical: ESPACIADO.xxl,
    paddingHorizontal: ESPACIADO.lg,
    gap: ESPACIADO.sm,
  },
  vacioIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.sm,
  },
  vacioTitulo: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
  },
  vacioDesc: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    padding: ESPACIADO.md,
    gap: ESPACIADO.sm,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    backgroundColor: COLORES.fondo,
  },
  botonCrear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primario,
    borderRadius: RADIO.xl,
    paddingVertical: 14,
    shadowColor: COLORES.primario,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  botonCrearTexto: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
  },
  ayuda: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoDeshabilitado,
    textAlign: 'center',
  },
});

export default SeleccionarWallet;
