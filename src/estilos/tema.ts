import { StyleSheet } from 'react-native';
import { COLORES } from './colores';

export const ESPACIADO = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIO = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const FUENTE = {
  tamanoXs: 11,
  tamanoPequeno: 13,
  tamanoBase: 15,
  tamanoMedio: 17,
  tamanoGrande: 20,
  tamanoXl: 24,
  tamanoXxl: 30,
  pesoNormal: '400' as const,
  pesoMedio: '500' as const,
  pesoSemibold: '600' as const,
  pesoBold: '700' as const,
};

export const estilosComunes = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separador: {
    height: 1,
    backgroundColor: COLORES.borde,
  },
  sombra: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sombraLeve: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
});
