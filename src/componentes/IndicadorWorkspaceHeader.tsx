import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWallet } from '../contexto/WalletContext';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO } from '../estilos/tema';
import { PERSONAL } from '../estilos/personalTema';

type Props = {
  /** Colores alineados con el stack personal (tabs finanzas personales). */
  variantePersonal?: boolean;
  /** Encabezado apilado con otros botones (p. ej. lápiz de edición). */
  compacto?: boolean;
};

/**
 * Muestra el workspace activo en el header para reducir confusiones empresa vs personal.
 */
const IndicadorWorkspaceHeader: React.FC<Props> = ({ variantePersonal, compacto }) => {
  const { walletSeleccionado } = useWallet();
  if (!walletSeleccionado) return null;

  const tipo = walletSeleccionado.tipo ?? 'empresa';
  const esPersonal = variantePersonal || tipo === 'personal';
  const etiqueta = esPersonal ? 'Personal' : 'Negocio';
  const nombre = walletSeleccionado.nombre?.trim() || 'Workspace';

  return (
    <View
      style={[
        estilos.wrap,
        esPersonal ? estilos.wrapPersonal : estilos.wrapEmpresa,
        compacto && estilos.wrapCompacto,
      ]}
      accessibilityLabel={`Workspace ${etiqueta}: ${nombre}`}
    >
      <Text style={[estilos.etiqueta, esPersonal ? estilos.etiquetaPersonal : estilos.etiquetaEmpresa]} numberOfLines={1}>
        {etiqueta}
      </Text>
      <Text style={[estilos.nombre, esPersonal ? estilos.nombrePersonal : null]} numberOfLines={1}>
        {nombre}
      </Text>
    </View>
  );
};

const estilos = StyleSheet.create({
  wrap: {
    maxWidth: 148,
    marginRight: ESPACIADO.xs,
    paddingVertical: 4,
    paddingHorizontal: ESPACIADO.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  wrapEmpresa: {
    backgroundColor: COLORES.primarioClaro,
    borderColor: COLORES.primario,
  },
  wrapPersonal: {
    backgroundColor: PERSONAL.accentClaro,
    borderColor: PERSONAL.accent,
  },
  etiqueta: {
    fontSize: 9,
    fontWeight: FUENTE.pesoBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  etiquetaEmpresa: { color: COLORES.primario },
  etiquetaPersonal: { color: PERSONAL.accentOscuro },
  nombre: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold as '600',
    color: COLORES.texto,
    marginTop: 1,
  },
  nombrePersonal: { color: PERSONAL.accentOscuro },
  wrapCompacto: { maxWidth: 96, paddingHorizontal: ESPACIADO.xs },
});

export default IndicadorWorkspaceHeader;
