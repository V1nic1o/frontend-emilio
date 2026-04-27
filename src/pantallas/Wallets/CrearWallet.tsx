import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WalletStackParamList } from '../../navegacion/tipos';
import { walletsServicio } from '../../servicios/wallets.servicio';
import { useWallet } from '../../contexto/WalletContext';
import { TipoWallet } from '../../tipos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';

type Props = NativeStackScreenProps<WalletStackParamList, 'CrearWallet'>;

const COLORES_PRESET = [
  '#2563EB', // Azul
  '#7C3AED', // Morado
  '#059669', // Verde
  '#D97706', // Ámbar
  '#DC2626', // Rojo
  '#0891B2', // Cyan
  '#EA580C', // Naranja
  '#0F766E', // Teal
];

const CrearWallet: React.FC<Props> = ({ navigation }) => {
  const { recargarWallets, seleccionar } = useWallet();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [colorSeleccionado, setColorSeleccionado] = useState(COLORES_PRESET[0]);
  const [tipo, setTipo] = useState<TipoWallet>('empresa');
  const [guardando, setGuardando] = useState(false);
  const [errorNombre, setErrorNombre] = useState('');

  const validar = (): boolean => {
    if (!nombre.trim()) {
      setErrorNombre('El nombre es obligatorio');
      return false;
    }
    setErrorNombre('');
    return true;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const nuevo = await walletsServicio.crear({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        color: colorSeleccionado,
        tipo,
      });
      await recargarWallets();
      seleccionar(nuevo);
    } catch {
      Alert.alert('Error', 'No se pudo crear el workspace');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Vista previa */}
          <View style={[estilos.preview, { backgroundColor: colorSeleccionado }]}>
            <View style={estilos.previewDot} />
            <Text style={estilos.previewNombre}>{nombre || 'Mi Workspace'}</Text>
          </View>

          <CampoTexto
            etiqueta="Nombre"
            placeholder="Ej: Mi Empresa, Personal, Tienda..."
            value={nombre}
            onChangeText={setNombre}
            error={errorNombre}
            icono="briefcase-outline"
            autoFocus
            maxLength={80}
          />

          <Text style={estilos.tipoLabel}>Tipo de workspace</Text>
          <View style={estilos.tipoRow}>
            <TouchableOpacity
              style={[estilos.tipoChip, tipo === 'empresa' && estilos.tipoChipActivo]}
              onPress={() => setTipo('empresa')}
              activeOpacity={0.85}
            >
              <Ionicons name="business-outline" size={18} color={tipo === 'empresa' ? COLORES.blanco : COLORES.primario} />
              <Text style={[estilos.tipoChipTxt, tipo === 'empresa' && estilos.tipoChipTxtActivo]}>Empresa</Text>
              <Text style={[estilos.tipoChipSub, tipo === 'empresa' && estilos.tipoChipSubActivo]}>Pedidos, clientes, catálogo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.tipoChip, tipo === 'personal' && estilos.tipoChipActivoMorado]}
              onPress={() => setTipo('personal')}
              activeOpacity={0.85}
            >
              <Ionicons name="person-outline" size={18} color={tipo === 'personal' ? COLORES.blanco : COLORES.morado} />
              <Text style={[estilos.tipoChipTxt, tipo === 'personal' && estilos.tipoChipTxtActivo]}>Personal</Text>
              <Text style={[estilos.tipoChipSub, tipo === 'personal' && estilos.tipoChipSubActivo]}>Ingresos, gastos, deudas, ahorros</Text>
            </TouchableOpacity>
          </View>

          <CampoTexto
            etiqueta="Descripción (opcional)"
            placeholder="Ej: Pedidos de la tienda principal"
            value={descripcion}
            onChangeText={setDescripcion}
            icono="create-outline"
            maxLength={200}
          />

          <Text style={estilos.colorLabel}>Color</Text>
          <View style={estilos.coloresGrid}>
            {COLORES_PRESET.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  estilos.colorBtn,
                  { backgroundColor: color },
                  colorSeleccionado === color && estilos.colorBtnActivo,
                ]}
                onPress={() => setColorSeleccionado(color)}
                activeOpacity={0.8}
              >
                {colorSeleccionado === color && (
                  <Text style={estilos.colorCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={estilos.footer}>
          <BotonPrimario titulo="Crear Workspace" onPress={handleGuardar} cargando={guardando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xl },

  preview: {
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    marginBottom: ESPACIADO.lg,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  previewNombre: {
    fontSize: FUENTE.tamanoMedio,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
  },

  tipoLabel: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.sm,
    marginTop: ESPACIADO.sm,
  },
  tipoRow: { flexDirection: 'row', gap: ESPACIADO.sm, marginBottom: ESPACIADO.sm },
  tipoChip: {
    flex: 1,
    borderRadius: RADIO.lg,
    borderWidth: 2,
    borderColor: COLORES.borde,
    padding: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    gap: 4,
  },
  tipoChipActivo: { borderColor: COLORES.primario, backgroundColor: COLORES.primario },
  tipoChipActivoMorado: { borderColor: COLORES.morado, backgroundColor: COLORES.morado },
  tipoChipTxt: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  tipoChipTxtActivo: { color: COLORES.blanco },
  tipoChipSub: { fontSize: 10, color: COLORES.textoSecundario, lineHeight: 14 },
  tipoChipSubActivo: { color: 'rgba(255,255,255,0.9)' },
  colorLabel: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.sm,
    marginTop: ESPACIADO.md,
  },
  coloresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACIADO.sm,
  },
  colorBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBtnActivo: {
    borderWidth: 3,
    borderColor: COLORES.blanco,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheck: {
    color: COLORES.blanco,
    fontWeight: FUENTE.pesoBold,
    fontSize: FUENTE.tamanoBase,
  },

  footer: {
    padding: ESPACIADO.md,
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
});

export default CrearWallet;
