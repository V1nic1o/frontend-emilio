import React, { useMemo } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  AuthStackParamList,
  TabParamList,
  TabParamListPersonal,
  WalletStackParamList,
  InicioStackParamList,
  PersonasStackParamList,
  PedidosStackParamList,
  GastosStackParamList,
  CatalogoStackParamList,
  EmpresaStackParamList,
  InicioPersonalStackParamList,
  IngresosPersonalStackParamList,
  DeudasPersonalStackParamList,
  AhorrosPersonalStackParamList,
} from './tipos';

import { useWallet } from '../contexto/WalletContext';
import { useAuth } from '../contexto/AuthContext';

// Auth
import Login from '../pantallas/Auth/Login';
import Registro from '../pantallas/Auth/Registro';
import SolicitarResetContrasena from '../pantallas/Auth/SolicitarResetContrasena';
import RestablecerContrasena from '../pantallas/Auth/RestablecerContrasena';

// Wallets
import SeleccionarWallet from '../pantallas/Wallets/SeleccionarWallet';
import CrearWallet from '../pantallas/Wallets/CrearWallet';

// App
import Inicio from '../pantallas/Inicio';
import AsesoriasPendientesCobroPantalla from '../pantallas/Inicio/AsesoriasPendientesCobroPantalla';
import PedidosPorPagarPantalla from '../pantallas/Inicio/PedidosPorPagarPantalla';
import PendientesSinSaldarPantalla from '../pantallas/Inicio/PendientesSinSaldarPantalla';
import PorCobrarDetallePantalla from '../pantallas/Inicio/PorCobrarDetallePantalla';
import DetalleGananciaMesPantalla from '../pantallas/Inicio/DetalleGananciaMesPantalla';
import DesgloseMesPantalla from '../pantallas/Inicio/DesgloseMesPantalla';
import HistorialMesesAcumuladoPantalla from '../pantallas/Inicio/HistorialMesesAcumuladoPantalla';
import ResumenPeriodoPantalla from '../pantallas/Inicio/ResumenPeriodoPantalla';
import ListaPersonas from '../pantallas/Personas/ListaPersonas';
import CrearPersona from '../pantallas/Personas/CrearPersona';
import DetallePersona from '../pantallas/Personas/DetallePersona';
import AsesoriaMensualPantalla from '../pantallas/Personas/AsesoriaMensualPantalla';
import ListaPedidos from '../pantallas/Pedidos/ListaPedidos';
import CrearPedido from '../pantallas/Pedidos/CrearPedido';
import DetallePedido from '../pantallas/Pedidos/DetallePedido';
import ListaGastos from '../pantallas/Gastos/ListaGastos';
import CrearGasto from '../pantallas/Gastos/CrearGasto';
import EditarGasto from '../pantallas/Gastos/EditarGasto';
import CatalogoProductos from '../pantallas/Productos/CatalogoProductos';
import FormProducto from '../pantallas/Productos/FormProducto';
import AgregarSeleccionCatalogo from '../pantallas/Productos/AgregarSeleccionCatalogo';
import MiEmpresa from '../pantallas/Empresa/MiEmpresa';
import PantallaPerfil from '../pantallas/Cuenta/PantallaPerfil';
import CambiarContrasena from '../pantallas/Cuenta/CambiarContrasena';
import InicioPersonal from '../pantallas/Personal/InicioPersonal';
import ListaIngresosPersonales from '../pantallas/Personal/ingresos/ListaIngresosPersonales';
import CrearIngresoPersonal from '../pantallas/Personal/ingresos/CrearIngresoPersonal';
import EditarIngresoPersonal from '../pantallas/Personal/ingresos/EditarIngresoPersonal';
import ListaDeudasPersonales from '../pantallas/Personal/deudas/ListaDeudasPersonales';
import CrearDeudaPersonal from '../pantallas/Personal/deudas/CrearDeudaPersonal';
import EditarDeudaPersonal from '../pantallas/Personal/deudas/EditarDeudaPersonal';
import ListaAhorrosPersonales from '../pantallas/Personal/ahorros/ListaAhorrosPersonales';
import CrearAhorroPersonal from '../pantallas/Personal/ahorros/CrearAhorroPersonal';
import EditarAhorroPersonal from '../pantallas/Personal/ahorros/EditarAhorroPersonal';
import { COLORES } from '../estilos/colores';
import { PERSONAL } from '../estilos/personalTema';
import { FUENTE } from '../estilos/tema';
import IndicadorWorkspaceHeader from '../componentes/IndicadorWorkspaceHeader';

const Tab = createBottomTabNavigator<TabParamList>();
const TabPersonal = createBottomTabNavigator<TabParamListPersonal>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const InicioStack = createNativeStackNavigator<InicioStackParamList>();
const PersonasStack = createNativeStackNavigator<PersonasStackParamList>();
const PedidosStack = createNativeStackNavigator<PedidosStackParamList>();
const GastosStack = createNativeStackNavigator<GastosStackParamList>();
const CatalogoStack = createNativeStackNavigator<CatalogoStackParamList>();
const EmpresaStack = createNativeStackNavigator<EmpresaStackParamList>();
const InicioPersonalStack = createNativeStackNavigator<InicioPersonalStackParamList>();
const IngresosPersonalStack = createNativeStackNavigator<IngresosPersonalStackParamList>();
const DeudasPersonalStack = createNativeStackNavigator<DeudasPersonalStackParamList>();
const AhorrosPersonalStack = createNativeStackNavigator<AhorrosPersonalStackParamList>();
const GastosStackPersonal = createNativeStackNavigator<GastosStackParamList>();

const opcionesHeader = {
  headerStyle: { backgroundColor: COLORES.tarjeta },
  headerTintColor: COLORES.texto,
  headerTitleStyle: { fontWeight: FUENTE.pesoBold as 'bold', fontSize: FUENTE.tamanoMedio },
  headerShadowVisible: false,
  headerBackTitle: '',
  headerRight: () => <IndicadorWorkspaceHeader />,
};

const opcionesHeaderPersonal = {
  headerStyle: { backgroundColor: PERSONAL.headerFondo },
  headerTintColor: PERSONAL.accentOscuro,
  headerTitleStyle: { fontWeight: FUENTE.pesoBold as 'bold', fontSize: FUENTE.tamanoMedio },
  headerShadowVisible: false,
  headerBackTitle: '',
  contentStyle: { backgroundColor: PERSONAL.fondo },
  headerRight: () => <IndicadorWorkspaceHeader variantePersonal />,
};

// Botón "← Volver" que regresa desde Mi empresa al stack anterior
const estilosNav = StyleSheet.create({
  volverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 4,
  },
  volverTexto: {
    fontSize: 15,
    color: COLORES.primario,
    fontWeight: '500',
  },
});

const BotonVolver = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={estilosNav.volverBtn}>
    <Ionicons name="chevron-back" size={18} color={COLORES.primario} />
    <Text style={estilosNav.volverTexto}>Menú</Text>
  </TouchableOpacity>
);

const prefijoSitioWeb = process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');

function enlacesAutenticacion(): LinkingOptions<AuthStackParamList> {
  return {
    prefixes: [Linking.createURL('/'), ...(prefijoSitioWeb ? [prefijoSitioWeb] : [])],
    config: {
      screens: {
        Login: '',
        Registro: 'registro',
        SolicitarResetContrasena: 'olvido-contrasena',
        RestablecerContrasena: 'restablecer-contrasena/:token',
      },
    },
  };
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="Registro" component={Registro} />
      <AuthStack.Screen name="SolicitarResetContrasena" component={SolicitarResetContrasena} />
      <AuthStack.Screen name="RestablecerContrasena" component={RestablecerContrasena} />
    </AuthStack.Navigator>
  );
}

function WalletNavigator() {
  return (
    <WalletStack.Navigator screenOptions={{ ...opcionesHeader, headerShown: false }}>
      <WalletStack.Screen name="SeleccionarWallet" component={SeleccionarWallet} />
      <WalletStack.Screen name="CrearWallet" component={CrearWallet} options={{ headerShown: true, title: 'Nuevo Workspace', presentation: 'modal' }} />
    </WalletStack.Navigator>
  );
}

function InicioNavigator() {
  return (
    <InicioStack.Navigator screenOptions={opcionesHeader}>
      <InicioStack.Screen name="Inicio" component={Inicio} options={{ headerShown: false }} />
      <InicioStack.Screen name="Perfil" component={PantallaPerfil} options={{ title: 'Cuenta' }} />
      <InicioStack.Screen
        name="AsesoriasPendientesCobro"
        component={AsesoriasPendientesCobroPantalla}
        options={{ title: 'Asesorías por cobrar' }}
      />
      <InicioStack.Screen name="PedidosPorPagar" component={PedidosPorPagarPantalla} options={{ title: 'Por pagar' }} />
      <InicioStack.Screen
        name="PendientesSinSaldar"
        component={PendientesSinSaldarPantalla}
        options={{ title: 'Sin saldar' }}
      />
      <InicioStack.Screen name="PorCobrarDetalle" component={PorCobrarDetallePantalla} options={{ title: 'Por cobrar' }} />
      <InicioStack.Screen
        name="DetalleGananciaMes"
        component={DetalleGananciaMesPantalla}
        options={{ title: 'Detalle del mes' }}
      />
      <InicioStack.Screen name="DesgloseMes" component={DesgloseMesPantalla} options={{ title: 'Movimientos del mes' }} />
      <InicioStack.Screen
        name="HistorialMesesAcumulado"
        component={HistorialMesesAcumuladoPantalla}
        options={{ title: 'Historial por mes' }}
      />
      <InicioStack.Screen name="ResumenPeriodo" component={ResumenPeriodoPantalla} options={{ title: 'Resumen · negocio' }} />
      <InicioStack.Screen name="CambiarContrasena" component={CambiarContrasena} options={{ title: 'Cambiar contraseña' }} />
    </InicioStack.Navigator>
  );
}

function PersonasNavigator() {
  return (
    <PersonasStack.Navigator screenOptions={opcionesHeader}>
      <PersonasStack.Screen name="ListaPersonas" component={ListaPersonas} options={{ title: 'Personas' }} />
      <PersonasStack.Screen name="CrearPersona" component={CrearPersona} options={{ title: 'Nueva Persona', presentation: 'modal' }} />
      <PersonasStack.Screen name="DetallePersona" component={DetallePersona} options={{ title: 'Detalle' }} />
      <PersonasStack.Screen name="AsesoriaMensual" component={AsesoriaMensualPantalla} options={{ title: 'Asesoría mensual' }} />
      <PersonasStack.Screen name="DetallePedido" component={DetallePedido} options={{ title: 'Pedido' }} />
      <PersonasStack.Screen name="CrearPedido" component={CrearPedido} options={{ title: 'Nuevo Pedido' }} />
    </PersonasStack.Navigator>
  );
}

function PedidosNavigator() {
  return (
    <PedidosStack.Navigator screenOptions={opcionesHeader}>
      <PedidosStack.Screen name="ListaPedidos" component={ListaPedidos} options={{ title: 'Pedidos' }} />
      <PedidosStack.Screen name="CrearPedido" component={CrearPedido} options={{ title: 'Nuevo Pedido' }} />
      <PedidosStack.Screen name="DetallePedido" component={DetallePedido} options={{ title: 'Pedido' }} />
    </PedidosStack.Navigator>
  );
}

function GastosNavigator() {
  return (
    <GastosStack.Navigator screenOptions={opcionesHeader}>
      <GastosStack.Screen name="ListaGastos" component={ListaGastos} options={{ title: 'Gastos' }} />
      <GastosStack.Screen name="CrearGasto" component={CrearGasto} options={{ title: 'Nuevo Gasto', presentation: 'modal' }} />
      <GastosStack.Screen name="EditarGasto" component={EditarGasto} options={{ title: 'Editar gasto', presentation: 'modal' }} />
    </GastosStack.Navigator>
  );
}

/** Gastos dentro del tab personal (sin botón «Menú» del stack raíz). */
function GastosPersonalNavigator() {
  return (
    <GastosStackPersonal.Navigator screenOptions={opcionesHeaderPersonal}>
      <GastosStackPersonal.Screen name="ListaGastos" component={ListaGastos} options={{ title: 'Gastos' }} />
      <GastosStackPersonal.Screen name="CrearGasto" component={CrearGasto} options={{ title: 'Nuevo Gasto', presentation: 'modal' }} />
      <GastosStackPersonal.Screen name="EditarGasto" component={EditarGasto} options={{ title: 'Editar gasto', presentation: 'modal' }} />
    </GastosStackPersonal.Navigator>
  );
}

function InicioPersonalNavigator() {
  return (
    <InicioPersonalStack.Navigator screenOptions={opcionesHeaderPersonal}>
      <InicioPersonalStack.Screen name="InicioPersonal" component={InicioPersonal} options={{ headerShown: false }} />
      <InicioPersonalStack.Screen name="Perfil" component={PantallaPerfil} options={{ title: 'Cuenta' }} />
      <InicioPersonalStack.Screen
        name="ResumenPeriodo"
        component={ResumenPeriodoPantalla}
        options={{ title: 'Resumen · personal' }}
      />
      <InicioPersonalStack.Screen
        name="CambiarContrasena"
        component={CambiarContrasena}
        options={{ title: 'Cambiar contraseña' }}
      />
    </InicioPersonalStack.Navigator>
  );
}

function IngresosPersonalNavigator() {
  return (
    <IngresosPersonalStack.Navigator screenOptions={opcionesHeaderPersonal}>
      <IngresosPersonalStack.Screen name="ListaIngresosPersonales" component={ListaIngresosPersonales} options={{ title: 'Ingresos' }} />
      <IngresosPersonalStack.Screen name="CrearIngresoPersonal" component={CrearIngresoPersonal} options={{ title: 'Nuevo ingreso', presentation: 'modal' }} />
      <IngresosPersonalStack.Screen
        name="EditarIngresoPersonal"
        component={EditarIngresoPersonal}
        options={{ title: 'Editar ingreso', presentation: 'modal' }}
      />
    </IngresosPersonalStack.Navigator>
  );
}

function DeudasPersonalNavigator() {
  return (
    <DeudasPersonalStack.Navigator screenOptions={opcionesHeaderPersonal}>
      <DeudasPersonalStack.Screen name="ListaDeudasPersonales" component={ListaDeudasPersonales} options={{ title: 'Deudas' }} />
      <DeudasPersonalStack.Screen name="CrearDeudaPersonal" component={CrearDeudaPersonal} options={{ title: 'Nueva deuda', presentation: 'modal' }} />
      <DeudasPersonalStack.Screen name="EditarDeudaPersonal" component={EditarDeudaPersonal} options={{ title: 'Editar deuda', presentation: 'modal' }} />
    </DeudasPersonalStack.Navigator>
  );
}

function AhorrosPersonalNavigator() {
  return (
    <AhorrosPersonalStack.Navigator screenOptions={opcionesHeaderPersonal}>
      <AhorrosPersonalStack.Screen name="ListaAhorrosPersonales" component={ListaAhorrosPersonales} options={{ title: 'Ahorros' }} />
      <AhorrosPersonalStack.Screen name="CrearAhorroPersonal" component={CrearAhorroPersonal} options={{ title: 'Nueva meta', presentation: 'modal' }} />
      <AhorrosPersonalStack.Screen name="EditarAhorroPersonal" component={EditarAhorroPersonal} options={{ title: 'Editar meta', presentation: 'modal' }} />
    </AhorrosPersonalStack.Navigator>
  );
}

function CatalogoNavigator() {
  return (
    <CatalogoStack.Navigator screenOptions={opcionesHeader}>
      <CatalogoStack.Screen name="CatalogoProductos" component={CatalogoProductos} options={{ title: 'Catálogo' }} />
      <CatalogoStack.Screen
        name="AgregarSeleccionCatalogo"
        component={AgregarSeleccionCatalogo}
        options={{ title: 'Selección al carrito' }}
      />
      <CatalogoStack.Screen name="FormProducto" component={FormProducto} options={{ title: 'Producto', presentation: 'modal' }} />
    </CatalogoStack.Navigator>
  );
}

function EmpresaNavigator() {
  return (
    <EmpresaStack.Navigator screenOptions={opcionesHeader}>
      <EmpresaStack.Screen
        name="MiEmpresa"
        component={MiEmpresa}
        options={({ navigation }) => ({
          title: 'Mi empresa',
          headerLeft: () => <BotonVolver onPress={() => navigation.getParent()?.goBack()} />,
        })}
      />
    </EmpresaStack.Navigator>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { activo: IoniconName; inactivo: IoniconName }> = {
  InicioTab: { activo: 'home', inactivo: 'home-outline' },
  PersonasTab: { activo: 'people', inactivo: 'people-outline' },
  PedidosTab: { activo: 'cube', inactivo: 'cube-outline' },
  CatalogoTab: { activo: 'layers', inactivo: 'layers-outline' },
  GastosTab: { activo: 'wallet', inactivo: 'wallet-outline' },
};

function AppTabs() {
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom, 10);
  const tabBarAlturaBase = 52;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) {
            return <Ionicons name="ellipse-outline" size={size} color={color} />;
          }
          const nombre = focused ? icons.activo : icons.inactivo;
          return <Ionicons name={nombre} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORES.primario,
        tabBarInactiveTintColor: COLORES.textoSecundario,
        tabBarStyle: {
          backgroundColor: COLORES.tarjeta,
          borderTopColor: COLORES.borde,
          borderTopWidth: 1,
          height: tabBarAlturaBase + tabBarPaddingBottom,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: FUENTE.pesoSemibold,
        },
      })}
    >
      <Tab.Screen
        name="InicioTab"
        component={InicioNavigator}
        options={{ title: 'Inicio' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('InicioTab', { screen: 'Inicio' });
          },
        })}
      />
      <Tab.Screen
        name="PersonasTab"
        component={PersonasNavigator}
        options={{ title: 'Personas' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('PersonasTab', { screen: 'ListaPersonas' });
          },
        })}
      />
      <Tab.Screen
        name="PedidosTab"
        component={PedidosNavigator}
        options={{ title: 'Pedidos' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            // Si el stack quedó en DetallePedido/CrearPedido, al tocar el tab volvemos a la lista.
            navigation.navigate('PedidosTab', { screen: 'ListaPedidos', params: {} });
          },
        })}
      />
      <Tab.Screen
        name="CatalogoTab"
        component={CatalogoNavigator}
        options={{ title: 'Catálogo' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('CatalogoTab', { screen: 'CatalogoProductos', params: {} });
          },
        })}
      />
      <Tab.Screen
        name="GastosTab"
        component={GastosNavigator}
        options={{ title: 'Gastos' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('GastosTab', { screen: 'ListaGastos', params: {} });
          },
        })}
      />
    </Tab.Navigator>
  );
}

const TAB_ICONS_PERSONAL: Record<string, { activo: IoniconName; inactivo: IoniconName }> = {
  InicioPersonalTab: { activo: 'home', inactivo: 'home-outline' },
  IngresosPersonalTab: { activo: 'trending-up', inactivo: 'trending-up-outline' },
  GastosPersonalTab: { activo: 'wallet', inactivo: 'wallet-outline' },
  DeudasPersonalTab: { activo: 'document-text', inactivo: 'document-text-outline' },
  AhorrosPersonalTab: { activo: 'cash', inactivo: 'cash-outline' },
};

function AppTabsPersonal() {
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom, 10);
  const tabBarAlturaBase = 52;
  return (
    <TabPersonal.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS_PERSONAL[route.name];
          if (!icons) {
            return <Ionicons name="ellipse-outline" size={size} color={color} />;
          }
          const nombre = focused ? icons.activo : icons.inactivo;
          return <Ionicons name={nombre} size={size} color={color} />;
        },
        tabBarActiveTintColor: PERSONAL.accentOscuro,
        tabBarInactiveTintColor: COLORES.textoSecundario,
        tabBarStyle: {
          backgroundColor: PERSONAL.headerFondo,
          borderTopColor: COLORES.borde,
          borderTopWidth: 1,
          height: tabBarAlturaBase + tabBarPaddingBottom,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: FUENTE.pesoSemibold,
        },
      })}
    >
      <TabPersonal.Screen
        name="InicioPersonalTab"
        component={InicioPersonalNavigator}
        options={{ title: 'Inicio' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('InicioPersonalTab', { screen: 'InicioPersonal' });
          },
        })}
      />
      <TabPersonal.Screen
        name="IngresosPersonalTab"
        component={IngresosPersonalNavigator}
        options={{ title: 'Ingresos' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('IngresosPersonalTab', { screen: 'ListaIngresosPersonales' });
          },
        })}
      />
      <TabPersonal.Screen
        name="GastosPersonalTab"
        component={GastosPersonalNavigator}
        options={{ title: 'Gastos' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('GastosPersonalTab', { screen: 'ListaGastos' });
          },
        })}
      />
      <TabPersonal.Screen
        name="DeudasPersonalTab"
        component={DeudasPersonalNavigator}
        options={{ title: 'Deudas' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('DeudasPersonalTab', { screen: 'ListaDeudasPersonales' });
          },
        })}
      />
      <TabPersonal.Screen
        name="AhorrosPersonalTab"
        component={AhorrosPersonalNavigator}
        options={{ title: 'Ahorros' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('AhorrosPersonalTab', { screen: 'ListaAhorrosPersonales' });
          },
        })}
      />
    </TabPersonal.Navigator>
  );
}

// Navegador que incluye Gastos y Catálogo accesibles desde el tab "Más" como stacks independientes
// pero dentro del mismo NavigationContainer
function AppConStacks() {
  const { walletSeleccionado } = useWallet();
  return walletSeleccionado ? <AppTabsConStacks /> : <WalletNavigator />;
}

// Gastos y empresa siguen en el stack raíz (desde Más). Catálogo vive en el tab inferior.
const RootStack = createNativeStackNavigator();

function AppTabsConStacks() {
  const { walletSeleccionado } = useWallet();
  const esPersonal = walletSeleccionado?.tipo === 'personal';

  if (esPersonal) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabsPersonal" component={AppTabsPersonal} />
      </RootStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={AppTabs} />
      <RootStack.Screen name="EmpresaStack" component={EmpresaNavigator} options={{ presentation: 'card' }} />
    </RootStack.Navigator>
  );
}

export default function Navegacion() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const { cargando: cargandoWallet } = useWallet();
  const opcionesEnlace = useMemo(() => enlacesAutenticacion(), []);

  if (cargandoAuth || cargandoWallet) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.fondo }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={opcionesEnlace}>
      {!usuario ? <AuthNavigator /> : <AppConStacks />}
    </NavigationContainer>
  );
}
