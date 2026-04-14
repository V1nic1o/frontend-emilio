export type InicioStackParamList = {
  Inicio: undefined;
};

export type PersonasStackParamList = {
  ListaPersonas: undefined;
  CrearPersona: undefined;
  DetallePersona: { personaId: number };
  DetallePedido: { pedidoId: number };
  CrearPedido: { personaId?: number };
};

export type PedidosStackParamList = {
  ListaPedidos: undefined;
  CrearPedido: { personaId?: number };
  DetallePedido: { pedidoId: number };
};

export type GastosStackParamList = {
  ListaGastos: undefined;
  CrearGasto: undefined;
};

import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  InicioTab: NavigatorScreenParams<InicioStackParamList> | undefined;
  PersonasTab: NavigatorScreenParams<PersonasStackParamList> | undefined;
  PedidosTab: NavigatorScreenParams<PedidosStackParamList> | undefined;
  GastosTab: NavigatorScreenParams<GastosStackParamList> | undefined;
};
