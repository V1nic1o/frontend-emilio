import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORES } from '../estilos/colores';
import { ANCHO_MAX_CONTENIDO_WEB, esPlataformaWeb, FONDO_EXTERIOR_WEB } from '../estilos/layoutWeb';

/**
 * En **web** centra toda la app y limita el ancho; en iOS/Android no añade contenedores (comportamiento idéntico al anterior).
 */
export function ContenedorLayoutWeb({ children }: { children: React.ReactNode }) {
  if (!esPlataformaWeb()) {
    return <>{children}</>;
  }
  return (
    <View style={estilos.fondoExterior} accessibilityRole="none">
      <View style={estilos.columna}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondoExterior: {
    flex: 1,
    width: '100%' as const,
    backgroundColor: FONDO_EXTERIOR_WEB,
    alignItems: 'center',
  },
  columna: {
    flex: 1,
    width: '100%' as const,
    maxWidth: ANCHO_MAX_CONTENIDO_WEB,
    backgroundColor: COLORES.fondo,
    borderLeftColor: COLORES.borde,
    borderRightColor: COLORES.borde,
    ...Platform.select({
      web: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        // Sombra suave en navegadores (react-native-web)
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.06)',
      } as const,
      default: {},
    }),
  },
});
