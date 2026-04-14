import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';
import BotonPrimario from './BotonPrimario';

interface Props {
  mensaje: string;
  onReintentar?: () => void;
}

const ErrorMensaje: React.FC<Props> = ({ mensaje, onReintentar }) => {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.caja}>
        <View style={estilos.iconBox}>
          <Ionicons name="warning-outline" size={32} color={COLORES.peligro} />
        </View>
        <Text style={estilos.titulo}>Algo salió mal</Text>
        <Text style={estilos.texto}>{mensaje}</Text>
        {onReintentar && (
          <BotonPrimario
            titulo="Reintentar"
            onPress={onReintentar}
            variante="secundario"
            pequeno
            estilo={{ marginTop: ESPACIADO.sm, alignSelf: 'center' }}
          />
        )}
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ESPACIADO.lg,
    backgroundColor: COLORES.fondo,
  },
  caja: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORES.peligroClaro,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORES.peligroClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.md,
  },
  titulo: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.xs,
  },
  texto: {
    fontSize: FUENTE.tamanoBase,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ErrorMensaje;
