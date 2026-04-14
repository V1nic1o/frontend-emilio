import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO } from '../estilos/tema';

interface Props {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
  colorValor?: string;
  estilo?: ViewStyle;
}

const FilaDetalle: React.FC<Props> = ({ etiqueta, valor, destacado, colorValor, estilo }) => {
  return (
    <View style={[estilos.fila, estilo]}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text
        style={[
          estilos.valor,
          destacado && estilos.valorDestacado,
          colorValor ? { color: colorValor } : null,
        ]}
      >
        {valor}
      </Text>
    </View>
  );
};

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ESPACIADO.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  etiqueta: {
    fontSize: FUENTE.tamanoBase,
    color: COLORES.textoSecundario,
    flex: 1,
  },
  valor: {
    fontSize: FUENTE.tamanoBase,
    color: COLORES.texto,
    fontWeight: FUENTE.pesoMedio,
    textAlign: 'right',
    flex: 1,
  },
  valorDestacado: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
  },
});

export default FilaDetalle;
