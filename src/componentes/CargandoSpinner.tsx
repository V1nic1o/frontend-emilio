import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO } from '../estilos/tema';

interface Props {
  mensaje?: string;
}

const CargandoSpinner: React.FC<Props> = ({ mensaje = 'Cargando...' }) => {
  return (
    <View style={estilos.contenedor}>
      <ActivityIndicator size="large" color={COLORES.primario} />
      <Text style={estilos.texto}>{mensaje}</Text>
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.fondo,
    gap: ESPACIADO.sm,
  },
  texto: {
    fontSize: FUENTE.tamanoBase,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoMedio,
  },
});

export default CargandoSpinner;
