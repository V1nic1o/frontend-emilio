import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';

interface Opcion<T> {
  valor: T;
  etiqueta: string;
}

interface Props<T> {
  opciones: Opcion<T>[];
  valorSeleccionado: T;
  onSeleccionar: (valor: T) => void;
  etiqueta?: string;
}

function SelectorToggle<T extends string>({
  opciones,
  valorSeleccionado,
  onSeleccionar,
  etiqueta,
}: Props<T>) {
  return (
    <View style={estilos.contenedor}>
      {etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <View style={estilos.grupo}>
        {opciones.map((op) => {
          const activo = op.valor === valorSeleccionado;
          return (
            <TouchableOpacity
              key={String(op.valor)}
              onPress={() => onSeleccionar(op.valor)}
              style={[estilos.opcion, activo && estilos.opcionActiva]}
              activeOpacity={0.8}
            >
              <Text style={[estilos.texto, activo && estilos.textoActivo]}>
                {op.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    marginBottom: ESPACIADO.md,
  },
  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grupo: {
    flexDirection: 'row',
    backgroundColor: COLORES.grisClaro,
    borderRadius: RADIO.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  opcion: {
    flex: 1,
    paddingVertical: ESPACIADO.sm,
    alignItems: 'center',
    borderRadius: RADIO.sm,
  },
  opcionActiva: {
    backgroundColor: COLORES.primario,
  },
  texto: {
    fontSize: FUENTE.tamanoBase,
    color: COLORES.textoSecundario,
    fontWeight: FUENTE.pesoMedio,
  },
  textoActivo: {
    color: COLORES.blanco,
    fontWeight: FUENTE.pesoBold,
  },
});

export default SelectorToggle;
