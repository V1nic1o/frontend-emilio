import { Alert, Platform } from 'react-native';

/** En web, `Alert.alert` no muestra diálogo; usamos el alert nativo del navegador. */
export function mostrarAlerta(titulo: string, mensaje: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensaje}`);
    return;
  }
  Alert.alert(titulo, mensaje);
}
