import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../estilos/colores';
import { PERSONAL } from '../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';

/** Fondo por defecto si no hay color de workspace válido (modo empresa). */
const FONDO_BTN_WORKSPACE_EMPRESA = '#F0F0FF';

type Props = {
  /** Primera línea (ej. día y fecha). Va debajo de la fila de iconos. */
  lineaSuperior: string;
  /** Título principal debajo de la línea superior. */
  titulo: string;
  variantePersonal?: boolean;
  onPressPerfil: () => void;
  /** Reservado para cuando exista backend de notificaciones. */
  onPressNotificaciones: () => void;
  /** Menú lateral / opciones; opcional — si no se pasa, el botón no hace acción (preparado para el futuro). */
  onPressMenu?: () => void;
  /** Cambiar de workspace: botón junto a fecha y título. */
  onPressCambiarWorkspace?: () => void;
  /** Color elegido al crear el workspace (`wallet.color`) — punto, icono y acabado del botón. */
  colorWorkspace?: string;
};

const TAM_BURBUJA = 46;
/** Alineado con ~2 líneas de fecha + título (sin dominar el bloque de texto). */
const TAM_BTN_WORKSPACE = 48;
const ICON_SWAP_WORKSPACE = 18;
const TAM_PUNTO_WORKSPACE = 7;

const sombraBurbuja = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  android: {
    elevation: 4,
  },
  default: {},
});

/** Normaliza `#RRGGBB` o `RRGGBB`. */
function normalizarHex(hex: string | undefined): string | null {
  if (!hex || typeof hex !== 'string') return null;
  const t = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;
  return null;
}

/** Añade canal alpha a hex 6 dígitos (#RRGGBBAA). */
function hexConAlpha(hex6: string, alpha01: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha01)) * 255);
  return `${hex6}${a.toString(16).padStart(2, '0')}`;
}

/** Mezcla el color con blanco para un fondo suave identificable. */
function mezclarConBlanco(hex6: string, fraccionBlanco: number): string {
  const r = parseInt(hex6.slice(1, 3), 16);
  const g = parseInt(hex6.slice(3, 5), 16);
  const b = parseInt(hex6.slice(5, 7), 16);
  const w = Math.min(1, Math.max(0, fraccionBlanco));
  const rn = Math.round(r + (255 - r) * w);
  const gn = Math.round(g + (255 - g) * w);
  const bn = Math.round(b + (255 - b) * w);
  return `#${rn.toString(16).padStart(2, '0')}${gn.toString(16).padStart(2, '0')}${bn.toString(16).padStart(2, '0')}`;
}

/**
 * Barra superior: burbujas (menú · notificaciones · perfil) y fila con fecha, título y opcional botón de cambiar espacio.
 */
const EncabezadoPanelSuperior: React.FC<Props> = ({
  lineaSuperior,
  titulo,
  variantePersonal,
  onPressPerfil,
  onPressNotificaciones,
  onPressMenu,
  onPressCambiarWorkspace,
  colorWorkspace,
}) => {
  const accent = variantePersonal ? PERSONAL.accentOscuro : COLORES.primario;
  const texto = COLORES.texto;
  const sec = COLORES.textoSecundario;
  const fondoFallback = variantePersonal ? PERSONAL.accentClaro : FONDO_BTN_WORKSPACE_EMPRESA;

  const hexWs = normalizarHex(colorWorkspace);
  const colorMarca = hexWs ?? accent;

  const fondoInterior = hexWs ? mezclarConBlanco(hexWs, 0.86) : fondoFallback;
  const bordeInterior = hexWs ? hexConAlpha(hexWs, 0.38) : variantePersonal ? hexConAlpha(PERSONAL.accentOscuro, 0.22) : hexConAlpha(COLORES.primario, 0.22);
  const haloExterno = hexWs ? hexConAlpha(hexWs, 0.14) : 'transparent';

  const sombraColoreada =
    hexWs != null
      ? Platform.select({
          ios: {
            shadowColor: hexWs,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 8,
          },
          android: { elevation: 4 },
          default: {},
        })
      : Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 5,
          },
          android: { elevation: 3 },
          default: {},
        });

  const sombraPunto =
    hexWs != null
      ? Platform.select({
          ios: {
            shadowColor: hexWs,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.55,
            shadowRadius: 3,
          },
          android: { elevation: 2 },
          default: {},
        })
      : {};

  let botonCambiarWorkspace: React.ReactNode = null;
  if (onPressCambiarWorkspace != null) {
    const boton = (
      <TouchableOpacity
        style={[
          estilos.btnWorkspaceCuadrado,
          {
            backgroundColor: fondoInterior,
            borderColor: bordeInterior,
          },
          sombraColoreada,
        ]}
        onPress={onPressCambiarWorkspace}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Cambiar de workspace"
        accessibilityHint="Elegí otro espacio sin cerrar sesión"
      >
        <View style={estilos.workspaceIconStack}>
          <View style={[estilos.workspacePunto, { backgroundColor: colorMarca }, sombraPunto]} />
          <Ionicons name="swap-horizontal-outline" size={ICON_SWAP_WORKSPACE} color={colorMarca} />
        </View>
      </TouchableOpacity>
    );
    botonCambiarWorkspace =
      hexWs != null ? (
        <View style={[estilos.workspaceMoldura, { backgroundColor: haloExterno }]}>{boton}</View>
      ) : (
        boton
      );
  }

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.barraIconos}>
        <TouchableOpacity
          style={[estilos.burbuja, sombraBurbuja]}
          onPress={() => onPressMenu?.()}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Menú"
          accessibilityHint="Próximamente podrás abrir más opciones desde aquí"
        >
          <Ionicons name="menu-outline" size={24} color={accent} />
        </TouchableOpacity>

        <View style={estilos.grupoDerecha}>
          <TouchableOpacity
            style={[estilos.burbuja, sombraBurbuja]}
            onPress={onPressNotificaciones}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel="Notificaciones"
            accessibilityHint="Próximamente disponible"
          >
            <Ionicons name="notifications-outline" size={22} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.burbuja, sombraBurbuja]}
            onPress={onPressPerfil}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel="Cuenta y perfil"
          >
            <Ionicons name="person-circle-outline" size={24} color={accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.filaContexto}>
        <View style={estilos.bloqueTexto}>
          <Text style={[estilos.lineaSup, { color: sec }]} numberOfLines={2}>
            {lineaSuperior}
          </Text>
          <Text style={[estilos.titulo, { color: texto }]} numberOfLines={2}>
            {titulo}
          </Text>
        </View>
        {botonCambiarWorkspace}
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    marginBottom: ESPACIADO.md,
  },
  barraIconos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ESPACIADO.md,
  },
  grupoDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
  },
  burbuja: {
    width: TAM_BURBUJA,
    height: TAM_BURBUJA,
    borderRadius: TAM_BURBUJA / 2,
    backgroundColor: COLORES.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaContexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    minWidth: 0,
  },
  bloqueTexto: {
    flex: 1,
    minWidth: 0,
  },
  workspaceMoldura: {
    padding: 2,
    borderRadius: RADIO.lg + 3,
    flexShrink: 0,
  },
  btnWorkspaceCuadrado: {
    width: TAM_BTN_WORKSPACE,
    height: TAM_BTN_WORKSPACE,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  workspaceIconStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  workspacePunto: {
    width: TAM_PUNTO_WORKSPACE,
    height: TAM_PUNTO_WORKSPACE,
    borderRadius: TAM_PUNTO_WORKSPACE / 2,
  },
  lineaSup: {
    fontSize: FUENTE.tamanoBase,
    lineHeight: 20,
    marginBottom: 5,
    letterSpacing: 0.15,
  },
  titulo: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
});

export default EncabezadoPanelSuperior;
