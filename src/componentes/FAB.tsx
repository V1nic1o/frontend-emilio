import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../estilos/colores';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  onPress: () => void;
  icono?: IoniconName;
  /** Color de fondo del botón (nombre histórico `color`). */
  color?: string;
  colorIcono?: string;
  estilo?: ViewStyle;
}

const FAB: React.FC<Props> = ({
  onPress,
  icono = 'add',
  color = COLORES.primario,
  colorIcono = COLORES.blanco,
  estilo,
}) => (
  <TouchableOpacity
    style={[estilos.fab, { backgroundColor: color }, estilo]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Ionicons name={icono} size={28} color={colorIcono} />
  </TouchableOpacity>
);

const estilos = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default FAB;
