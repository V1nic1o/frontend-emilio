import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'FormProducto'>;

const OPCIONES_TIPO: { valor: TipoItem; etiqueta: string }[] = [
  { valor: 'bien', etiqueta: 'Producto' },
  { valor: 'servicio', etiqueta: 'Servicio' },
];

function dataUriDesdeAsset(asset: ImagePicker.ImagePickerAsset): string | null {
  if (!asset.base64) return null;
  const uri = (asset.uri ?? '').toLowerCase();
  const mime =
    asset.mimeType?.toLowerCase() ||
    (uri.endsWith('.png') ? 'image/png' : uri.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  const prefijo =
    mime === 'image/png'
      ? 'data:image/png;base64,'
      : mime === 'image/webp'
        ? 'data:image/webp;base64,'
        : 'data:image/jpeg;base64,';
  return `${prefijo}${asset.base64}`;
}

const FormProducto: React.FC<Props> = ({ navigation, route }) => {
  const { productoId } = route.params;
  const { walletSeleccionado } = useWallet();
  const esEdicion = !!productoId;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoItem>('bien');
  const [precioProveedor, setPrecioProveedor] = useState('');
  const [precioEmpresa, setPrecioEmpresa] = useState('');
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenBase64Nueva, setImagenBase64Nueva] = useState<string | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (esEdicion && productoId && walletSeleccionado) {
      productosServicio.listarPorWallet(walletSeleccionado.id).then((data) => {
        const producto = data.find((p) => p.id === productoId);
        if (producto) {
          setNombre(producto.nombre);
          setTipo(producto.tipo);
          setPrecioProveedor(String(producto.precioProveedor));
          setPrecioEmpresa(String(producto.precioEmpresa));
          setImagenPreview(producto.imagenUrl?.trim() || null);
        }
      });
    }
  }, [esEdicion, productoId, walletSeleccionado?.id]);

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      mostrarAlerta('Permiso requerido', 'Necesitás permitir el acceso a tus fotos');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      const dataUri = dataUriDesdeAsset(resultado.assets[0]);
      if (dataUri) {
        setImagenPreview(dataUri);
        setImagenBase64Nueva(dataUri);
        setQuitarImagen(false);
      }
    }
  };

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
      const payloadImagen = quitarImagen
        ? { eliminarImagen: true as const }
        : imagenBase64Nueva
          ? { imagenBase64: imagenBase64Nueva }
          : {};

      if (esEdicion && productoId) {
        await productosServicio.actualizar(productoId, {
          nombre: nombre.trim(),
          tipo,
          precioProveedor: parsearNumero(precioProveedor),
          precioEmpresa: parsearNumero(precioEmpresa),
          ...payloadImagen,
        });
      } else {
        await productosServicio.crear({
          walletId: walletSeleccionado.id,
          nombre: nombre.trim(),
          tipo,
          precioProveedor: parsearNumero(precioProveedor),
          precioEmpresa: parsearNumero(precioEmpresa),
          ...(imagenBase64Nueva ? { imagenBase64: imagenBase64Nueva } : {}),
        });
      }
      navigation.goBack();
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'No se pudo guardar el producto';
      mostrarAlerta('Error', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const margen = parsearNumero(precioEmpresa) - parsearNumero(precioProveedor);
  const margenPct = parsearNumero(precioProveedor) > 0
    ? Math.round((margen / parsearNumero(precioProveedor)) * 100)
    : 0;

  const mostrarImagen = imagenPreview && !quitarImagen;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.fotoSeccion}>
            <Text style={estilos.fotoEtiqueta}>Foto (opcional)</Text>
            <TouchableOpacity style={estilos.fotoContenedor} onPress={seleccionarImagen} activeOpacity={0.85}>
              {mostrarImagen ? (
                <Image source={{ uri: imagenPreview }} style={estilos.fotoImagen} resizeMode="cover" />
              ) : (
                <View style={estilos.fotoPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={COLORES.textoDeshabilitado} />
                  <Text style={estilos.fotoPlaceholderTxt}>Agregar foto</Text>
                </View>
              )}
              <View style={estilos.fotoEditarBtn}>
                <Ionicons name="images-outline" size={14} color={COLORES.blanco} />
              </View>
            </TouchableOpacity>
            <Text style={estilos.fotoAyuda}>Aparece en el catálogo y en el PDF para tus clientes</Text>
            {mostrarImagen && (
              <TouchableOpacity
                style={estilos.quitarFotoBtn}
                onPress={() => {
                  setImagenPreview(null);
                  setImagenBase64Nueva(null);
                  setQuitarImagen(true);
                }}
              >
                <Text style={estilos.quitarFotoTxt}>Quitar foto</Text>
              </TouchableOpacity>
            )}
          </View>

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

  fotoSeccion: { alignItems: 'center', marginBottom: ESPACIADO.md },
  fotoEtiqueta: {
    alignSelf: 'flex-start',
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.sm,
  },
  fotoContenedor: {
    width: 120,
    height: 120,
    borderRadius: RADIO.lg,
    overflow: 'hidden',
    backgroundColor: COLORES.grisClaro,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  fotoImagen: { width: '100%', height: '100%' },
  fotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fotoPlaceholderTxt: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoDeshabilitado,
  },
  fotoEditarBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoAyuda: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    marginTop: ESPACIADO.sm,
    lineHeight: 16,
  },
  quitarFotoBtn: { marginTop: ESPACIADO.xs },
  quitarFotoTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.peligro, fontWeight: FUENTE.pesoSemibold },

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
