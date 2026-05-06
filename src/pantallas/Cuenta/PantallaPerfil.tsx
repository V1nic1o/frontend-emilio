import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexto/AuthContext';
import { useWallet } from '../../contexto/WalletContext';
import { perfilServicio, PerfilEmpresa } from '../../servicios/perfil.servicio';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';
import { confirmarYEntonces } from '../../utilidades/alertaPlataforma';

const AVATAR_PERFIL = 88;
const COVER_ALTO = 112;
const AVATAR_OVERLAP = AVATAR_PERFIL / 2;

const PantallaPerfil: React.FC = () => {
  const { usuario, cerrarSesion } = useAuth();
  const { walletSeleccionado, limpiar } = useWallet();
  const navigation = useNavigation<any>();
  const esPersonal = walletSeleccionado?.tipo === 'personal';

  const [perfilEmpresa, setPerfilEmpresa] = useState<Partial<PerfilEmpresa> | null>(null);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(false);

  const cargarPerfilEmpresa = useCallback(async () => {
    if (esPersonal || !walletSeleccionado) {
      setPerfilEmpresa(null);
      setCargandoEmpresa(false);
      return;
    }
    setCargandoEmpresa(true);
    try {
      const data = await perfilServicio.obtener(walletSeleccionado.id);
      setPerfilEmpresa(data);
    } catch {
      setPerfilEmpresa({});
    } finally {
      setCargandoEmpresa(false);
    }
  }, [esPersonal, walletSeleccionado]);

  useFocusEffect(
    useCallback(() => {
      void cargarPerfilEmpresa();
    }, [cargarPerfilEmpresa]),
  );

  const confirmarCerrarSesion = () => {
    confirmarYEntonces(
      'Cerrar sesión',
      '¿Estás seguro que querés cerrar sesión?',
      { textoAceptar: 'Cerrar sesión', destructivo: true },
      async () => {
        limpiar();
        await cerrarSesion();
      },
    );
  };

  const irMiEmpresa = () => {
    navigation.navigate('EmpresaStack', { screen: 'MiEmpresa' });
  };

  const fondo = esPersonal ? PERSONAL.fondo : COLORES.fondo;
  const tarjeta = esPersonal ? PERSONAL.tarjeta : COLORES.tarjeta;
  const texto = COLORES.texto;
  const secundario = COLORES.textoSecundario;
  const accent = esPersonal ? PERSONAL.accentOscuro : COLORES.primario;

  const tituloTarjetaUnica = esPersonal ? 'Tu workspace' : 'Tu workspace y empresa';

  const uriLogoEmpresa =
    perfilEmpresa?.logoUrl?.trim() || perfilEmpresa?.logoBase64 || null;

  const coverBg = esPersonal ? PERSONAL.accentClaro : COLORES.primarioClaro;
  const coverTint = esPersonal ? PERSONAL.accentOscuro : COLORES.primario;

  return (
    <SafeAreaView style={[estilos.safe, { backgroundColor: fondo }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            estilos.perfilCard,
            {
              backgroundColor: tarjeta,
              borderColor: esPersonal ? PERSONAL.borde : COLORES.borde,
            },
          ]}
        >
          <View style={[estilos.perfilCover, { backgroundColor: coverBg }]}>
            <View
              style={[
                estilos.perfilCoverCirculo,
                { backgroundColor: coverTint, top: -28, right: -36 },
              ]}
            />
            <View
              style={[
                estilos.perfilCoverCirculo,
                { backgroundColor: coverTint, bottom: -40, left: -24, width: 140, height: 140, borderRadius: 70 },
              ]}
            />
          </View>

          <View style={[estilos.perfilAvatarFila, { marginTop: -AVATAR_OVERLAP }]}>
            <View style={estilos.perfilAvatarAnillo}>
              {!esPersonal && cargandoEmpresa ? (
                <View style={[estilos.perfilAvatarInterior, { backgroundColor: COLORES.grisClaro }]}>
                  <ActivityIndicator color={accent} />
                </View>
              ) : !esPersonal && uriLogoEmpresa ? (
                <View style={estilos.perfilAvatarInterior}>
                  <Image source={{ uri: uriLogoEmpresa }} style={estilos.perfilAvatarImg} resizeMode="contain" />
                </View>
              ) : (
                <View style={[estilos.perfilAvatarInterior, { backgroundColor: accent }]}>
                  {!esPersonal ? (
                    <Ionicons name="business-outline" size={36} color={COLORES.blanco} />
                  ) : (
                    <Text style={estilos.avatarTxt}>{usuario?.nombre?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={estilos.perfilTextos}>
            <Text style={[estilos.perfilNombre, { color: texto }]} numberOfLines={2}>
              {usuario?.nombre ?? 'Usuario'}
            </Text>
            <Text
              style={[estilos.perfilCorreo, { color: accent }]}
              numberOfLines={2}
              selectable
            >
              {usuario?.email ?? ''}
            </Text>
          </View>
        </View>

        {walletSeleccionado && (
          <View
            style={[
              estilos.card,
              {
                backgroundColor: tarjeta,
                borderColor: esPersonal ? PERSONAL.borde : COLORES.borde,
              },
            ]}
          >
            <Text style={[estilos.cardTit, { color: secundario }]}>{tituloTarjetaUnica}</Text>

            <View style={estilos.seccionWorkspace}>
              <Text style={[estilos.etiquetaSeccion, { color: secundario }]}>Workspace</Text>
              <View style={estilos.fila}>
                <View style={[estilos.punto, { backgroundColor: walletSeleccionado.color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[estilos.cardValor, { color: texto }]} numberOfLines={2}>
                    {walletSeleccionado.nombre}
                  </Text>
                  <Text style={[estilos.cardSub, { color: secundario }]}>
                    {esPersonal ? 'Espacio personal' : 'Negocio'}
                  </Text>
                </View>
              </View>
            </View>

            {!esPersonal && (
              <>
                <View style={[estilos.divisor, { backgroundColor: esPersonal ? PERSONAL.borde : COLORES.borde }]} />
                <Text style={[estilos.etiquetaSeccion, { color: secundario, marginBottom: ESPACIADO.sm }]}>
                  Empresa (PDFs y datos)
                </Text>
                {cargandoEmpresa ? (
                  <ActivityIndicator style={{ marginVertical: ESPACIADO.sm }} color={accent} />
                ) : (
                  <>
                    <Text style={[estilos.cardValor, { color: texto }]} numberOfLines={2}>
                      {perfilEmpresa?.nombreEmpresa?.trim() || 'Sin nombre cargado'}
                    </Text>
                    {!!perfilEmpresa?.nit?.trim() && (
                      <Text style={[estilos.cardSub, { color: secundario }]}>NIT {perfilEmpresa.nit}</Text>
                    )}
                    <TouchableOpacity
                      style={[estilos.btnPrim, { borderColor: accent }]}
                      onPress={irMiEmpresa}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="business-outline" size={20} color={accent} />
                      <Text style={[estilos.btnPrimTxt, { color: accent }]}>Editar datos de empresa</Text>
                      <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={estilos.btnSalir} onPress={confirmarCerrarSesion} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={COLORES.peligro} />
          <Text style={estilos.btnSalirTxt}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: ESPACIADO.xxl },
  perfilCard: {
    marginHorizontal: ESPACIADO.md,
    marginTop: ESPACIADO.sm,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  perfilCover: {
    height: COVER_ALTO,
    overflow: 'hidden',
  },
  perfilCoverCirculo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.12,
  },
  perfilAvatarFila: {
    paddingHorizontal: ESPACIADO.lg,
    alignItems: 'flex-start',
  },
  perfilAvatarAnillo: {
    width: AVATAR_PERFIL + 8,
    height: AVATAR_PERFIL + 8,
    borderRadius: (AVATAR_PERFIL + 8) / 2,
    borderWidth: 4,
    borderColor: COLORES.blanco,
    backgroundColor: COLORES.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  perfilAvatarInterior: {
    width: AVATAR_PERFIL,
    height: AVATAR_PERFIL,
    borderRadius: AVATAR_PERFIL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  perfilAvatarImg: {
    width: AVATAR_PERFIL,
    height: AVATAR_PERFIL,
    backgroundColor: COLORES.grisClaro,
  },
  avatarTxt: { fontSize: FUENTE.tamanoXl + 2, fontWeight: FUENTE.pesoBold, color: COLORES.blanco },
  perfilTextos: {
    paddingHorizontal: ESPACIADO.lg,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.lg,
    alignItems: 'flex-start',
  },
  perfilNombre: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  perfilCorreo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoMedio,
  },
  card: {
    marginHorizontal: ESPACIADO.md,
    marginTop: ESPACIADO.md,
    padding: ESPACIADO.md,
    borderRadius: RADIO.xl,
    borderWidth: 1,
  },
  cardTit: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: ESPACIADO.md,
  },
  seccionWorkspace: {
    marginBottom: 0,
  },
  etiquetaSeccion: {
    fontSize: 10,
    fontWeight: FUENTE.pesoBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: ESPACIADO.sm,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm },
  punto: { width: 8, height: 8, borderRadius: 4 },
  cardValor: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold },
  cardSub: { fontSize: FUENTE.tamanoXs, marginTop: ESPACIADO.xs },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginVertical: ESPACIADO.md,
    alignSelf: 'stretch',
  },
  btnPrim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    marginTop: ESPACIADO.md,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.sm,
    borderRadius: RADIO.lg,
    borderWidth: 1,
  },
  btnPrimTxt: { flex: 1, fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold },
  btnSalir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    margin: ESPACIADO.lg,
    padding: ESPACIADO.md,
    backgroundColor: COLORES.peligroClaro,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: COLORES.peligro + '40',
  },
  btnSalirTxt: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.peligro },
});

export default PantallaPerfil;
