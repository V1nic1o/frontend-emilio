import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexto/AuthContext';
import { useWallet } from '../../contexto/WalletContext';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';
import { confirmarAsync } from '../../utilidades/alertaPlataforma';

const MasPersonal: React.FC = () => {
  const { usuario, cerrarSesion } = useAuth();
  const { walletSeleccionado, volverAElegirWorkspace, limpiar } = useWallet();

  const confirmarCerrarSesion = async () => {
    const ok = await confirmarAsync('Cerrar sesión', '¿Estás seguro?', {
      textoAceptar: 'Cerrar sesión',
      destructivo: true,
    });
    if (!ok) return;
    limpiar();
    await cerrarSesion();
  };

  return (
    <SafeAreaView style={estilos.contenedor} edges={['top', 'bottom']}>
      <View style={estilos.encabezado}>
        <View style={estilos.avatarBox}>
          <Text style={estilos.avatarLetra}>{usuario?.nombre?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.etiquetaEspacio}>Espacio personal</Text>
          <Text style={estilos.nombreUsuario} numberOfLines={1}>{usuario?.nombre ?? 'Usuario'}</Text>
          <Text style={estilos.emailUsuario} numberOfLines={1}>{usuario?.email ?? ''}</Text>
        </View>
        {walletSeleccionado && (
          <View style={[estilos.walletBadge, { backgroundColor: (walletSeleccionado.color || COLORES.primario) + '20' }]}>
            <View style={[estilos.walletPunto, { backgroundColor: walletSeleccionado.color }]} />
            <Text style={[estilos.walletNombre, { color: walletSeleccionado.color }]} numberOfLines={1}>
              {walletSeleccionado.nombre}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={estilos.opcion} onPress={volverAElegirWorkspace} activeOpacity={0.85}>
        <View style={estilos.opcionIcono}>
          <Ionicons name="swap-horizontal-outline" size={24} color={PERSONAL.accentOscuro} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.opcionTitulo}>Cambiar de workspace</Text>
          <Text style={estilos.opcionDesc}>Elegí otro espacio personal o de empresa</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
      </TouchableOpacity>

      <TouchableOpacity style={estilos.btnCerrar} onPress={confirmarCerrarSesion} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={COLORES.peligro} />
        <Text style={estilos.btnCerrarTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: PERSONAL.fondo },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.md,
    padding: ESPACIADO.lg, backgroundColor: PERSONAL.tarjeta,
    borderBottomWidth: 3, borderBottomColor: PERSONAL.accent,
  },
  avatarBox: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: PERSONAL.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.blanco },
  etiquetaEspacio: {
    fontSize: 10,
    fontWeight: FUENTE.pesoBold,
    color: PERSONAL.accentOscuro,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  nombreUsuario: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  emailUsuario: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    maxWidth: 110, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIO.full,
  },
  walletPunto: { width: 6, height: 6, borderRadius: 3 },
  walletNombre: { fontSize: 10, fontWeight: FUENTE.pesoBold, flexShrink: 1 },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.md,
    margin: ESPACIADO.lg, padding: ESPACIADO.md, backgroundColor: PERSONAL.tarjeta,
    borderRadius: RADIO.xl, borderWidth: 1, borderColor: PERSONAL.borde,
  },
  opcionIcono: {
    width: 48,
    height: 48,
    borderRadius: RADIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PERSONAL.accentClaro,
  },
  opcionTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  opcionDesc: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  btnCerrar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: ESPACIADO.lg, marginTop: ESPACIADO.md, padding: ESPACIADO.md,
  },
  btnCerrarTexto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.peligro },
});

export default MasPersonal;
