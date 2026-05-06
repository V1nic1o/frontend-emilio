import React from 'react';
import { View, StyleSheet } from 'react-native';

/** Mismo color base que «Resumen por periodo». */
export const COLOR_FONDO_ATMOSFERA = '#F1F5F9';

const BLOB_EMPRESA = {
  blobA: 'rgba(79, 70, 229, 0.14)',
  blobB: 'rgba(165, 180, 252, 0.2)',
};

const BLOB_PERSONAL = {
  blobA: 'rgba(13, 148, 136, 0.16)',
  blobB: 'rgba(94, 234, 212, 0.14)',
};

/**
 * Círculos difuminados detrás del contenido (empresa vs personal), sin capturar toques.
 */
export function CapaBlobsAtmosfera({ esPersonal }: { esPersonal: boolean }) {
  const c = esPersonal ? BLOB_PERSONAL : BLOB_EMPRESA;
  return (
    <View style={estilosFondoAtmosfera.blobsWrap} pointerEvents="none">
      <View style={[estilosFondoAtmosfera.blob, estilosFondoAtmosfera.blobA, { backgroundColor: c.blobA }]} />
      <View style={[estilosFondoAtmosfera.blob, estilosFondoAtmosfera.blobB, { backgroundColor: c.blobB }]} />
    </View>
  );
}

export const estilosFondoAtmosfera = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR_FONDO_ATMOSFERA,
  },
  blobsWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  blob: {
    position: 'absolute',
    opacity: 0.95,
  },
  blobA: {
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -120,
    left: -90,
  },
  blobB: {
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -80,
    right: -70,
  },
  contenidoDelante: {
    flex: 1,
    zIndex: 1,
  },
});
