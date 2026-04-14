import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORES } from '../estilos/colores';
import { ESPACIADO, FUENTE, RADIO } from '../estilos/tema';

type Variante = 'primario' | 'secundario' | 'peligro' | 'exito';

interface Props {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  variante?: Variante;
  estilo?: ViewStyle;
  estiloTexto?: TextStyle;
  pequeno?: boolean;
}

const coloresPorVariante: Record<Variante, { fondo: string; texto: string; borde?: string }> = {
  primario: { fondo: COLORES.primario, texto: COLORES.blanco },
  secundario: { fondo: COLORES.grisClaro, texto: COLORES.texto, borde: COLORES.borde },
  peligro: { fondo: COLORES.peligroClaro, texto: COLORES.peligro },
  exito: { fondo: COLORES.exito, texto: COLORES.blanco },
};

const BotonPrimario: React.FC<Props> = ({
  titulo,
  onPress,
  cargando = false,
  deshabilitado = false,
  variante = 'primario',
  estilo,
  estiloTexto,
  pequeno = false,
}) => {
  const colores = coloresPorVariante[variante];
  const inactivo = deshabilitado || cargando;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactivo}
      activeOpacity={0.8}
      style={[
        estilos.boton,
        pequeno && estilos.pequeno,
        { backgroundColor: colores.fondo },
        colores.borde ? { borderWidth: 1, borderColor: colores.borde } : null,
        inactivo && estilos.inactivo,
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colores.texto} size="small" />
      ) : (
        <Text style={[estilos.texto, pequeno && estilos.textoPequeno, { color: colores.texto }, estiloTexto]}>
          {titulo}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  boton: {
    borderRadius: RADIO.md,
    paddingVertical: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  pequeno: {
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.md,
    minHeight: 38,
  },
  texto: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    letterSpacing: 0.2,
  },
  textoPequeno: {
    fontSize: FUENTE.tamanoPequeno,
  },
  inactivo: {
    opacity: 0.5,
  },
});

export default BotonPrimario;
