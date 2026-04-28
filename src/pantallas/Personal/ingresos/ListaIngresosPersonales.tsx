import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { IngresosPersonalStackParamList } from '../../../navegacion/tipos';
import { useIngresosPersonales } from '../../../hooks/useIngresosPersonales';
import { IngresoPersonal } from '../../../tipos';
import CargandoSpinner from '../../../componentes/CargandoSpinner';
import ErrorMensaje from '../../../componentes/ErrorMensaje';
import FAB from '../../../componentes/FAB';
import { COLORES } from '../../../estilos/colores';
import { PERSONAL } from '../../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../../utilidades/formato';
import { mostrarAlerta, confirmarYEntonces } from '../../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<IngresosPersonalStackParamList, 'ListaIngresosPersonales'>;

const ListaIngresosPersonales: React.FC<Props> = ({ navigation }) => {
  const { ingresos, cargando, error, cargar, eliminar } = useIngresosPersonales();

  useEffect(() => {
    const u = navigation.addListener('focus', cargar);
    return u;
  }, [navigation, cargar]);

  const onEliminar = useCallback(
    (item: IngresoPersonal) => {
      confirmarYEntonces(
        'Eliminar',
        `¿Quitar «${item.descripcion}»?`,
        { textoAceptar: 'Eliminar', destructivo: true },
        async () => {
          try {
            await eliminar(item.id);
          } catch (e: unknown) {
            mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      );
    },
    [eliminar],
  );

  if (cargando && ingresos.length === 0) return <CargandoSpinner />;
  if (error && ingresos.length === 0) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: PERSONAL.fondo }]} edges={['bottom']}>
      <FlatList
        data={ingresos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={COLORES.primario} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <Ionicons name="trending-up-outline" size={40} color={COLORES.textoDeshabilitado} />
            <Text style={estilos.vacioTxt}>Sin ingresos registrados este mes o anteriores</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={estilos.card}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.desc}>{item.descripcion}</Text>
              <Text style={estilos.fecha}>{formatearFecha(item.fecha)}</Text>
            </View>
            <Text style={estilos.monto}>{formatearMoneda(item.monto)}</Text>
            <View style={estilos.accionesFila}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditarIngresoPersonal', { ingresoId: item.id })}
                hitSlop={12}
                accessibilityLabel="Editar ingreso"
              >
                <Ionicons name="create-outline" size={20} color={COLORES.primario} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onEliminar(item)} hitSlop={12} accessibilityLabel="Eliminar ingreso">
                <Ionicons name="trash-outline" size={18} color={COLORES.peligro} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <FAB onPress={() => navigation.navigate('CrearIngresoPersonal')} />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta, padding: ESPACIADO.md, borderRadius: RADIO.lg, marginBottom: ESPACIADO.sm,
    borderWidth: 1, borderColor: COLORES.borde,
  },
  desc: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  fecha: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  monto: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: '#059669' },
  accionesFila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.sm },
  vacio: { padding: ESPACIADO.xl, alignItems: 'center', gap: ESPACIADO.sm },
  vacioTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default ListaIngresosPersonales;
