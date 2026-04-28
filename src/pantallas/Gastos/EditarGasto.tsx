import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { GastosStackParamList } from '../../navegacion/tipos';
import { useGastos } from '../../hooks/useGastos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { PERSONAL } from '../../estilos/personalTema';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { useWallet } from '../../contexto/WalletContext';
import { parsearNumero } from '../../utilidades/formato';
import { mostrarAlerta, alertaUnBoton } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<GastosStackParamList, 'EditarGasto'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface CategoriaConfig {
  nombre: string;
  icono: IoniconName;
  color: string;
  fondo: string;
}

const CATEGORIAS: CategoriaConfig[] = [
  { nombre: 'Insumos', icono: 'cube-outline', color: COLORES.primario, fondo: COLORES.primarioClaro },
  { nombre: 'Transporte', icono: 'car-outline', color: '#0891B2', fondo: '#E0F2FE' },
  { nombre: 'Servicios', icono: 'flash-outline', color: '#CA8A04', fondo: '#FEF9C3' },
  { nombre: 'Alquiler', icono: 'home-outline', color: '#7C3AED', fondo: '#EDE9FE' },
  { nombre: 'Comida', icono: 'fast-food-outline', color: '#EA580C', fondo: '#FFEDD5' },
  { nombre: 'Personal', icono: 'person-outline', color: '#0F766E', fondo: '#CCFBF1' },
  { nombre: 'Otro', icono: 'ellipsis-horizontal-circle-outline', color: COLORES.textoSecundario, fondo: COLORES.grisClaro },
];

function fechaAInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EditarGasto: React.FC<Props> = ({ navigation, route }) => {
  const { walletSeleccionado } = useWallet();
  const fondoPantalla = walletSeleccionado?.tipo === 'personal' ? PERSONAL.fondo : undefined;
  const { gastoId } = route.params;
  const { gastos, cargar, actualizar } = useGastos();
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<{ descripcion?: string; monto?: string; fecha?: string }>({});

  const aplicar = useCallback(() => {
    const g = gastos.find((x) => x.id === gastoId);
    if (!g) return;
    setDescripcion(g.descripcion);
    setMonto(String(g.monto));
    setFecha(fechaAInput(g.fecha));
    setCategoria(g.categoria ?? '');
  }, [gastos, gastoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    aplicar();
  }, [aplicar]);

  useEffect(() => {
    if (gastos.length > 0 && !gastos.some((x) => x.id === gastoId)) {
      alertaUnBoton('No encontrado', 'Este gasto ya no existe.', {
        textoBoton: 'OK',
        onPress: () => navigation.goBack(),
      });
    }
  }, [gastos, gastoId, navigation]);

  const validar = (): boolean => {
    const nuevos: typeof errores = {};
    if (!descripcion.trim()) nuevos.descripcion = 'La descripción es obligatoria';
    else if (descripcion.trim().length > 200) nuevos.descripcion = 'Máximo 200 caracteres';
    if (parsearNumero(monto) <= 0) nuevos.monto = 'El monto debe ser mayor a 0';
    const ft = fecha.trim();
    if (!ft || !/^\d{4}-\d{2}-\d{2}$/.test(ft)) nuevos.fecha = 'Usá AAAA-MM-DD';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    const ft = fecha.trim();
    setGuardando(true);
    try {
      await actualizar(gastoId, {
        descripcion: descripcion.trim(),
        monto: parsearNumero(monto),
        fecha: `${ft}T12:00:00.000Z`,
        categoria: categoria.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const catActiva = CATEGORIAS.find((c) => c.nombre === categoria);

  return (
    <SafeAreaView style={[estilosComunes.contenedor, fondoPantalla != null && { backgroundColor: fondoPantalla }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={estilos.etiqueta}>Categoría</Text>
          <View style={estilos.categoriasGrid}>
            {CATEGORIAS.map((cat) => {
              const activo = categoria === cat.nombre;
              return (
                <TouchableOpacity
                  key={cat.nombre}
                  style={[
                    estilos.categoriaBtn,
                    activo && estilos.categoriaBtnActivo,
                    activo && { borderColor: cat.color, backgroundColor: cat.fondo },
                  ]}
                  onPress={() => setCategoria(activo ? '' : cat.nombre)}
                  activeOpacity={0.82}
                >
                  <View style={[estilos.catIconBox, { backgroundColor: activo ? cat.color : cat.fondo }]}>
                    <Ionicons name={cat.icono} size={16} color={activo ? COLORES.blanco : cat.color} />
                  </View>
                  <Text style={[estilos.categoriaTexto, activo && { color: cat.color, fontWeight: FUENTE.pesoBold }]}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={estilos.separador} />

          <CampoTexto
            etiqueta="Descripción"
            placeholder={catActiva ? `Ej: ${catActiva.nombre}` : 'Ej: Compra'}
            value={descripcion}
            onChangeText={setDescripcion}
            error={errores.descripcion}
            icono="create-outline"
            maxLength={200}
          />
          <CampoTexto
            etiqueta="Monto"
            placeholder="0.00"
            value={monto}
            onChangeText={setMonto}
            error={errores.monto}
            icono="cash-outline"
            keyboardType="decimal-pad"
          />
          <CampoTexto
            etiqueta="Fecha (AAAA-MM-DD)"
            placeholder="2026-04-15"
            value={fecha}
            onChangeText={setFecha}
            error={errores.fecha}
            icono="calendar-outline"
            autoCapitalize="none"
            ayuda="Afecta en qué mes aparece el gasto en el resumen."
          />
        </ScrollView>
        <View style={estilos.footer}>
          <BotonPrimario titulo="Guardar cambios" onPress={handleGuardar} cargando={guardando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { padding: ESPACIADO.md },
  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.sm,
  },
  categoriasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIADO.sm, marginBottom: ESPACIADO.sm },
  categoriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: RADIO.lg,
    paddingVertical: ESPACIADO.sm,
    paddingHorizontal: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
  },
  categoriaBtnActivo: { borderWidth: 2 },
  catIconBox: {
    width: 28,
    height: 28,
    borderRadius: RADIO.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriaTexto: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoMedio },
  separador: { height: 1, backgroundColor: COLORES.borde, marginVertical: ESPACIADO.lg },
  footer: {
    padding: ESPACIADO.md,
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
});

export default EditarGasto;
