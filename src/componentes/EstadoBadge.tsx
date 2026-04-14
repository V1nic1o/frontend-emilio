import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EstadoPedido } from '../tipos';
import { COLORES } from '../estilos/colores';
import { FUENTE, RADIO, ESPACIADO } from '../estilos/tema';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  estado: EstadoPedido;
  grande?: boolean;
}

const CONFIG: Record<EstadoPedido, { etiqueta: string; fondo: string; texto: string; icono: IoniconName }> = {
  pendiente: { etiqueta: 'Sin pagar', fondo: COLORES.pendienteClaro, texto: COLORES.pendiente, icono: 'time-outline' },
  parcial:   { etiqueta: 'Pago parcial', fondo: COLORES.parcialClaro, texto: COLORES.parcial, icono: 'ellipse-outline' },
  pagado:    { etiqueta: 'Pagado', fondo: COLORES.pagadoClaro, texto: COLORES.pagado, icono: 'checkmark-circle' },
};

const EstadoBadge: React.FC<Props> = ({ estado, grande }) => {
  const config = CONFIG[estado] ?? CONFIG.pendiente;
  return (
    <View style={[estilos.badge, grande && estilos.grande, { backgroundColor: config.fondo }]}>
      <Ionicons name={config.icono} size={grande ? 13 : 11} color={config.texto} />
      <Text style={[estilos.texto, grande && estilos.textoGrande, { color: config.texto }]}>
        {config.etiqueta}
      </Text>
    </View>
  );
};

const estilos = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIO.full,
    paddingVertical: ESPACIADO.xs,
    paddingHorizontal: ESPACIADO.sm,
    alignSelf: 'flex-start',
  },
  grande: { paddingVertical: 6, paddingHorizontal: ESPACIADO.md },
  texto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold },
  textoGrande: { fontSize: FUENTE.tamanoPequeno },
});

export default EstadoBadge;
