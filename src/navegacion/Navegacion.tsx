import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  TabParamList,
  InicioStackParamList,
  PersonasStackParamList,
  PedidosStackParamList,
  GastosStackParamList,
} from './tipos';

import Inicio from '../pantallas/Inicio';
import ListaPersonas from '../pantallas/Personas/ListaPersonas';
import CrearPersona from '../pantallas/Personas/CrearPersona';
import DetallePersona from '../pantallas/Personas/DetallePersona';
import ListaPedidos from '../pantallas/Pedidos/ListaPedidos';
import CrearPedido from '../pantallas/Pedidos/CrearPedido';
import DetallePedido from '../pantallas/Pedidos/DetallePedido';
import ListaGastos from '../pantallas/Gastos/ListaGastos';
import CrearGasto from '../pantallas/Gastos/CrearGasto';

import { COLORES } from '../estilos/colores';
import { FUENTE } from '../estilos/tema';

const Tab = createBottomTabNavigator<TabParamList>();
const InicioStack = createNativeStackNavigator<InicioStackParamList>();
const PersonasStack = createNativeStackNavigator<PersonasStackParamList>();
const PedidosStack = createNativeStackNavigator<PedidosStackParamList>();
const GastosStack = createNativeStackNavigator<GastosStackParamList>();

const opcionesHeader = {
  headerStyle: {
    backgroundColor: COLORES.tarjeta,
  },
  headerTintColor: COLORES.texto,
  headerTitleStyle: {
    fontWeight: FUENTE.pesoBold as 'bold',
    fontSize: FUENTE.tamanoMedio,
  },
  headerShadowVisible: false,
  headerBackTitle: '',
};

function InicioNavigator() {
  return (
    <InicioStack.Navigator screenOptions={opcionesHeader}>
      <InicioStack.Screen name="Inicio" component={Inicio} options={{ headerShown: false }} />
    </InicioStack.Navigator>
  );
}

function PersonasNavigator() {
  return (
    <PersonasStack.Navigator screenOptions={opcionesHeader}>
      <PersonasStack.Screen name="ListaPersonas" component={ListaPersonas} options={{ title: 'Personas' }} />
      <PersonasStack.Screen name="CrearPersona" component={CrearPersona} options={{ title: 'Nueva Persona', presentation: 'modal' }} />
      <PersonasStack.Screen name="DetallePersona" component={DetallePersona} options={{ title: 'Detalle' }} />
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
    </GastosStack.Navigator>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { activo: IoniconName; inactivo: IoniconName }> = {
  InicioTab: { activo: 'home', inactivo: 'home-outline' },
  PersonasTab: { activo: 'people', inactivo: 'people-outline' },
  PedidosTab: { activo: 'cube', inactivo: 'cube-outline' },
  GastosTab: { activo: 'wallet', inactivo: 'wallet-outline' },
};

export default function Navegacion() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            const nombre = focused ? icons.activo : icons.inactivo;
            return <Ionicons name={nombre} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORES.primario,
          tabBarInactiveTintColor: COLORES.textoSecundario,
          tabBarStyle: {
            backgroundColor: COLORES.tarjeta,
            borderTopColor: COLORES.borde,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: FUENTE.tamanoXs,
            fontWeight: FUENTE.pesoSemibold,
          },
        })}
      >
        <Tab.Screen name="InicioTab" component={InicioNavigator} options={{ title: 'Inicio' }} />
        <Tab.Screen name="PersonasTab" component={PersonasNavigator} options={{ title: 'Personas' }} />
        <Tab.Screen name="PedidosTab" component={PedidosNavigator} options={{ title: 'Pedidos' }} />
        <Tab.Screen name="GastosTab" component={GastosNavigator} options={{ title: 'Gastos' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
