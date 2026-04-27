import { Platform } from 'react-native';

/** Ancho máximo del contenido en web (desktop); móviles y tablet en vertical siguen a 100%. */
export const ANCHO_MAX_CONTENIDO_WEB = 1200;

/** Fondo de los márgenes laterales en monitores anchos. */
export const FONDO_EXTERIOR_WEB = '#E0E1E6';

export function esPlataformaWeb(): boolean {
  return Platform.OS === 'web';
}
