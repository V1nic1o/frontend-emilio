import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexto/AuthContext';
import { useWallet } from '../../contexto/WalletContext';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../../estilos/tema';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface OpcionMenu {
  id: string;
  icono: IoniconName;
  titulo: string;
  descripcion: string;
  color: string;
  fondo: string;
  accion: () => void;
}

const PantallaMas: React.FC = () => {
  const { usuario, cerrarSesion } = useAuth();
  const { walletSeleccionado, limpiar } = useWallet();
  const navigation = useNavigation<any>();
  const confirmarCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión', style: 'destructive',
          onPress: async () => {
            limpiar();
            await cerrarSesion();
          },
        },
      ]
    );
  };

  const opciones: OpcionMenu[] = [
    {
      id: 'gastos',
      icono: 'wallet-outline',
      titulo: 'Gastos',
      descripcion: 'Registrá y consultá tus egresos',
      color: COLORES.morado,
      fondo: COLORES.moradoClaro,
      accion: () => navigation.navigate('GastosStack', { screen: 'ListaGastos' }),
    },
    {
      id: 'empresa',
      icono: 'business-outline',
      titulo: 'Mi empresa',
      descripcion: 'Logo, datos, NIT para tus PDFs',
      color: COLORES.primario,
      fondo: COLORES.primarioClaro,
      accion: () => navigation.navigate('EmpresaStack', { screen: 'MiEmpresa' }),
    },
  ];

  return (
    <SafeAreaView style={estilos.contenedor} edges={['top', 'bottom']}>
      <View style={estilos.encabezado}>
        <View style={estilos.avatarBox}>
          <Text style={estilos.avatarLetra}>{usuario?.nombre?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombreUsuario} numberOfLines={1}>{usuario?.nombre ?? 'Usuario'}</Text>
          <Text style={estilos.emailUsuario} numberOfLines={1}>{usuario?.email ?? ''}</Text>
        </View>
        {walletSeleccionado && (
          <View style={[estilos.walletBadge, { backgroundColor: walletSeleccionado.color + '20' }]}>
            <View style={[estilos.walletPunto, { backgroundColor: walletSeleccionado.color }]} />
            <Text style={[estilos.walletNombre, { color: walletSeleccionado.color }]} numberOfLines={1}>
              {walletSeleccionado.nombre}
            </Text>
          </View>
        )}
      </View>

      <View style={estilos.grid}>
        {opciones.map((op) => (
          <TouchableOpacity key={op.id} style={estilos.opcionCard} onPress={op.accion} activeOpacity={0.85}>
            <View style={[estilos.opcionIcono, { backgroundColor: op.fondo }]}>
              <Ionicons name={op.icono} size={24} color={op.color} />
            </View>
            <Text style={estilos.opcionTitulo}>{op.titulo}</Text>
            <Text style={estilos.opcionDesc}>{op.descripcion}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={estilos.btnCerrar} onPress={confirmarCerrarSesion} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={COLORES.peligro} />
        <Text style={estilos.btnCerrarTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.md,
    padding: ESPACIADO.lg, backgroundColor: COLORES.tarjeta,
    borderBottomWidth: 1, borderBottomColor: COLORES.borde,
  },
  avatarBox: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORES.primario,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.blanco },
  nombreUsuario: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  emailUsuario: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: ESPACIADO.sm, paddingVertical: 4,
    borderRadius: RADIO.lg, maxWidth: 120,
  },
  walletPunto: { width: 7, height: 7, borderRadius: 4 },
  walletNombre: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoSemibold },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: ESPACIADO.md, gap: ESPACIADO.md,
  },
  opcionCard: {
    width: '47%', backgroundColor: COLORES.tarjeta, borderRadius: RADIO.xl,
    padding: ESPACIADO.md, borderWidth: 1, borderColor: COLORES.borde,
    gap: ESPACIADO.sm,
  },
  opcionIcono: {
    width: 48, height: 48, borderRadius: RADIO.lg, alignItems: 'center', justifyContent: 'center',
  },
  opcionTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  opcionDesc: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, lineHeight: 16 },
  btnCerrar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESPACIADO.sm,
    margin: ESPACIADO.lg, padding: ESPACIADO.md,
    backgroundColor: COLORES.peligroClaro, borderRadius: RADIO.xl,
    borderWidth: 1, borderColor: COLORES.peligro + '40',
  },
  btnCerrarTexto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.peligro },
});

export default PantallaMas;
