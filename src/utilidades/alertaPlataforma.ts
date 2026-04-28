import { Alert, Platform } from 'react-native';

/** En web, `Alert.alert` no muestra diálogo; usamos el alert nativo del navegador. */
export function mostrarAlerta(titulo: string, mensaje: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensaje}`);
    return;
  }
  Alert.alert(titulo, mensaje);
}

function confirmarNativoPromise(
  titulo: string,
  mensaje: string,
  opciones?: { textoAceptar?: string; destructivo?: boolean },
): Promise<boolean> {
  const textoAceptar = opciones?.textoAceptar ?? 'Aceptar';
  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      {
        text: textoAceptar,
        style: opciones?.destructivo ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Diálogo Aceptar / Cancelar. En web usa `window.confirm` (Alert con botones no es fiable en RN Web).
 * Si lo llamás tras `await` dentro de un handler async, en web el navegador puede no mostrar el diálogo;
 * en ese caso usá {@link confirmarYEntonces} desde `onPress` sin `async` intermedio.
 */
export function confirmarAsync(
  titulo: string,
  mensaje: string,
  opciones?: { textoAceptar?: string; destructivo?: boolean },
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }
  return confirmarNativoPromise(titulo, mensaje, opciones);
}

/**
 * Confirmación desde `onPress` / clic: en web ejecuta `window.confirm` en el mismo tick (gesto de usuario válido).
 * `siAcepta` puede ser async; errores no capturados se silencian (como un fire-and-forget típico tras confirmar).
 */
export function confirmarYEntonces(
  titulo: string,
  mensaje: string,
  opciones: { textoAceptar?: string; destructivo?: boolean } | undefined,
  siAcepta: () => void | Promise<void>,
): void {
  const textoAceptar = opciones?.textoAceptar ?? 'Aceptar';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (!window.confirm(`${titulo}\n\n${mensaje}`)) return;
    void Promise.resolve(siAcepta()).catch(() => {});
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: textoAceptar,
      style: opciones?.destructivo ? 'destructive' : 'default',
      onPress: () => {
        void Promise.resolve(siAcepta()).catch(() => {});
      },
    },
  ]);
}

/** Un solo botón (p. ej. OK) y acción opcional; en web usa `alert`. */
export function alertaUnBoton(
  titulo: string,
  mensaje: string,
  opciones?: { textoBoton?: string; onPress?: () => void },
): void {
  const texto = opciones?.textoBoton ?? 'OK';
  const cb = opciones?.onPress;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensaje}`);
    cb?.();
    return;
  }
  Alert.alert(titulo, mensaje, [{ text: texto, onPress: cb }]);
}
