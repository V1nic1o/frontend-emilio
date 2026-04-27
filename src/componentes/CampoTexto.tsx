import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props extends TextInputProps {
  etiqueta?: string;
  ayuda?: string;
  error?: string;
  icono?: IoniconName;
  contenedor?: ViewStyle;
}

const CampoTexto: React.FC<Props> = ({ etiqueta, ayuda, error, icono, contenedor, secureTextEntry, ...inputProps }) => {
  const [enfocado, setEnfocado] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);

  const esPassword = secureTextEntry;

  return (
    <View style={[estilos.contenedor, contenedor]}>
      {etiqueta && (
        <Text style={estilos.etiqueta}>{etiqueta}</Text>
      )}
      <View style={[
        estilos.inputWrapper,
        enfocado && estilos.inputWrapperFocus,
        error ? estilos.inputWrapperError : null,
      ]}>
        {icono && (
          <Ionicons
            name={icono}
            size={18}
            color={enfocado ? COLORES.primario : COLORES.textoDeshabilitado}
            style={estilos.icono}
          />
        )}
        <TextInput
          style={[estilos.input, icono && estilos.inputConIcono]}
          placeholderTextColor={COLORES.textoDeshabilitado}
          secureTextEntry={esPassword && !mostrarTexto}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          {...inputProps}
        />
        {esPassword && (
          <TouchableOpacity onPress={() => setMostrarTexto((v) => !v)} style={estilos.iconoDer}>
            <Ionicons name={mostrarTexto ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORES.textoDeshabilitado} />
          </TouchableOpacity>
        )}
      </View>
      {ayuda && !error && <Text style={estilos.ayuda}>{ayuda}</Text>}
      {error && (
        <View style={estilos.errorFila}>
          <Ionicons name="alert-circle-outline" size={13} color={COLORES.peligro} />
          <Text style={estilos.error}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: { marginBottom: ESPACIADO.md },
  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    minHeight: 50,
    paddingHorizontal: ESPACIADO.md,
  },
  inputWrapperFocus: {
    borderColor: COLORES.primario,
    backgroundColor: COLORES.tarjeta,
  },
  inputWrapperError: {
    borderColor: COLORES.peligro,
    backgroundColor: COLORES.peligroClaro,
  },
  icono: { marginRight: ESPACIADO.sm },
  iconoDer: { marginLeft: ESPACIADO.sm, padding: 2 },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: FUENTE.tamanoBase,
    color: COLORES.texto,
    paddingVertical: ESPACIADO.sm,
  },
  inputConIcono: { paddingLeft: 0 },
  ayuda: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    marginTop: 5,
    marginLeft: 2,
  },
  errorFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  error: {
    flex: 1,
    minWidth: 0,
    fontSize: FUENTE.tamanoXs,
    color: COLORES.peligro,
  },
});

export default CampoTexto;
