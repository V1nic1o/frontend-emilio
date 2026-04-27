import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CatalogoStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { productosServicio } from '../../servicios/productos.servicio';
import { TipoItem } from '../../tipos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import SelectorToggle from '../../componentes/SelectorToggle';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { parsearNumero } from '../../utilidades/formato';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'FormProducto'>;

const OPCIONES_TIPO: { valor: TipoItem; etiqueta: string }[] = [
  { valor: 'bien', etiqueta: 'Producto' },
  { valor: 'servicio', etiqueta: 'Servicio' },
];

const FormProducto: React.FC<Props> = ({ navigation, route }) => {
  const { productoId } = route.params;
  const { walletSeleccionado } = useWallet();
  const esEdicion = !!productoId;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoItem>('bien');
  const [precioProveedor, setPrecioProveedor] = useState('');
  const [precioEmpresa, setPrecioEmpresa] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (esEdicion && productoId) {
      productosServicio.listarPorWallet(walletSeleccionado!.id).then((data) => {
        const producto = data.find((p) => p.id === productoId);
        if (producto) {
          setNombre(producto.nombre);
          setTipo(producto.tipo);
          setPrecioProveedor(String(producto.precioProveedor));
          setPrecioEmpresa(String(producto.precioEmpresa));
        }
      });
    }
  }, []);

  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = 'El nombre es obligatorio';
    if (parsearNumero(precioProveedor) < 0) nuevos.precioProveedor = 'Precio inválido';
    if (parsearNumero(precioEmpresa) < 0) nuevos.precioEmpresa = 'Precio inválido';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar() || !walletSeleccionado) return;
    setGuardando(true);
    try {
      if (esEdicion && productoId) {
        await productosServicio.actualizar(productoId, {
          nombre: nombre.trim(),
          tipo,
          precioProveedor: parsearNumero(precioProveedor),
          precioEmpresa: parsearNumero(precioEmpresa),
        });
      } else {
        await productosServicio.crear({
          walletId: walletSeleccionado.id,
          nombre: nombre.trim(),
          tipo,
          precioProveedor: parsearNumero(precioProveedor),
          precioEmpresa: parsearNumero(precioEmpresa),
        });
      }
      navigation.goBack();
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'No se pudo guardar el producto';
      Alert.alert('Error', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const margen = parsearNumero(precioEmpresa) - parsearNumero(precioProveedor);
  const margenPct = parsearNumero(precioProveedor) > 0
    ? Math.round((margen / parsearNumero(precioProveedor)) * 100)
    : 0;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SelectorToggle
            opciones={OPCIONES_TIPO}
            valorSeleccionado={tipo}
            onSeleccionar={(v) => setTipo(v)}
          />

          <CampoTexto
            etiqueta="Nombre"
            placeholder={tipo === 'bien' ? 'Ej: Planta orquídea' : 'Ej: Asesoría mensual'}
            value={nombre}
            onChangeText={setNombre}
            error={errores.nombre}
            icono={tipo === 'bien' ? 'cube-outline' : 'construct-outline'}
            autoFocus={!esEdicion}
            maxLength={150}
          />

          <View style={estilos.fila}>
            <CampoTexto
              etiqueta="Precio proveedor"
              placeholder="0.00"
              value={precioProveedor}
              onChangeText={setPrecioProveedor}
              error={errores.precioProveedor}
              keyboardType="decimal-pad"
              icono="arrow-down-circle-outline"
              contenedor={{ flex: 1, marginRight: ESPACIADO.sm }}
            />
            <CampoTexto
              etiqueta="Precio venta"
              placeholder="0.00"
              value={precioEmpresa}
              onChangeText={setPrecioEmpresa}
              error={errores.precioEmpresa}
              keyboardType="decimal-pad"
              icono="arrow-up-circle-outline"
              contenedor={{ flex: 1, marginLeft: ESPACIADO.sm }}
            />
          </View>

          {margen > 0 && (
            <View style={estilos.margenCard}>
              <Ionicons name="trending-up" size={16} color={COLORES.pagado} />
              <Text style={estilos.margenTexto}>
                Margen: <Text style={{ fontWeight: FUENTE.pesoBold }}>{margenPct}%</Text> sobre el costo
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={estilos.footer}>
          <BotonPrimario
            titulo={esEdicion ? 'Actualizar' : 'Agregar al catálogo'}
            onPress={handleGuardar}
            cargando={guardando}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xl },

  fila: { flexDirection: 'row' },

  margenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.pagadoClaro,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.md,
    marginTop: ESPACIADO.sm,
  },
  margenTexto: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.pagado,
  },

  footer: {
    padding: ESPACIADO.md,
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
});

export default FormProducto;
