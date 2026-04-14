import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORES } from '../estilos/colores';
import { ESPACIADO, RADIO, estilosComunes } from '../estilos/tema';

interface Props {
  children: React.ReactNode;
  estilo?: ViewStyle;
  sinPadding?: boolean;
}

const Tarjeta: React.FC<Props> = ({ children, estilo, sinPadding }) => {
  return (
    <View style={[estilos.tarjeta, sinPadding && estilos.sinPadding, estilo]}>
      {children}
    </View>
  );
};

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    ...estilosComunes.sombra,
  },
  sinPadding: {
    padding: 0,
    overflow: 'hidden',
  },
});

export default Tarjeta;
