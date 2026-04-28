import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PersonasStackParamList } from '../../navegacion/tipos';
import { usePersonas } from '../../hooks/usePersonas';
import { TipoPersona } from '../../tipos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<PersonasStackParamList, 'CrearPersona'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TipoConfig {
  valor: TipoPersona;
  icono: IoniconName;
  titulo: string;
  descripcion: string;
  color: string;
  fondo: string;
  fondoActivo: string;
}

const TIPOS: TipoConfig[] = [
  {
    valor: 'cliente',
    icono: 'person-outline',
    titulo: 'Cliente',
    descripcion: 'Le vendés algo. Registrás ventas.',
    color: COLORES.primario,
    fondo: COLORES.primarioClaro,
    fondoActivo: COLORES.primario,
  },
  {
    valor: 'proveedor',
    icono: 'business-outline',
    titulo: 'Proveedor',
    descripcion: 'Te vende algo. Registrás compras.',
    color: COLORES.morado,
    fondo: COLORES.moradoClaro,
    fondoActivo: COLORES.morado,
  },
];

const CrearPersona: React.FC<Props> = ({ navigation }) => {
  const { crear } = usePersonas();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoPersona>('cliente');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nit, setNit] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorNombre, setErrorNombre] = useState('');

  useFocusEffect(
    useCallback(() => {
      setNombre('');
      setTipo('cliente');
      setDireccion('');
      setEmail('');
      setTelefono('');
      setNit('');
      setErrorNombre('');
    }, [])
  );

  const validar = (): boolean => {
    if (!nombre.trim()) {
      setErrorNombre('El nombre es obligatorio');
      return false;
    }
    if (nombre.trim().length > 100) {
      setErrorNombre('Máximo 100 caracteres');
      return false;
    }
    setErrorNombre('');
    return true;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      await crear({
        nombre: nombre.trim(),
        tipo,
        nit: nit.trim() || undefined,
        direccion: direccion.trim() || undefined,
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo crear la persona');
    } finally {
      setGuardando(false);
    }
  };

  const tipoActual = TIPOS.find((t) => t.valor === tipo)!;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={estilos.etiqueta}>Tipo</Text>
          <View style={estilos.tiposGrid}>
            {TIPOS.map((t) => {
              const activo = tipo === t.valor;
              return (
                <TouchableOpacity
                  key={t.valor}
                  style={[estilos.tipoCard, activo && estilos.tipoCardActivo, activo && { borderColor: t.color }]}
                  onPress={() => setTipo(t.valor)}
                  activeOpacity={0.85}
                >
                  <View style={[estilos.tipoIconBox, { backgroundColor: activo ? t.fondoActivo : t.fondo }]}>
                    <Ionicons name={t.icono} size={22} color={activo ? COLORES.blanco : t.color} />
                  </View>
                  <Text style={[estilos.tipoTitulo, activo && { color: t.color }]}>{t.titulo}</Text>
                  <Text style={estilos.tipoDesc}>{t.descripcion}</Text>
                  {activo && (
                    <View style={[estilos.check, { backgroundColor: t.color }]}>
                      <Ionicons name="checkmark" size={12} color={COLORES.blanco} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <CampoTexto
            etiqueta="Nombre"
            placeholder={tipo === 'cliente' ? 'Ej: Juan Pérez' : 'Ej: Distribuidora Norte'}
            value={nombre}
            onChangeText={setNombre}
            error={errorNombre}
            icono={tipo === 'cliente' ? 'person-outline' : 'business-outline'}
            autoFocus
            maxLength={100}
            contenedor={{ marginTop: ESPACIADO.lg }}
          />

          <CampoTexto
            etiqueta="NIT (opcional)"
            placeholder="Ej: 1234567-8 o CF"
            value={nit}
            onChangeText={setNit}
            icono="card-outline"
            maxLength={30}
            autoCapitalize="characters"
          />

          <CampoTexto
            etiqueta="Dirección (opcional)"
            placeholder="Ej: Calle 5 #12, Ciudad"
            value={direccion}
            onChangeText={setDireccion}
            icono="location-outline"
          />
          <CampoTexto
            etiqueta="Email (opcional)"
            placeholder="Ej: contacto@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icono="mail-outline"
          />
          <CampoTexto
            etiqueta="Teléfono (opcional)"
            placeholder="Ej: +502 3012 3456"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            icono="call-outline"
          />
        </ScrollView>

        <View style={estilos.footer}>
          <BotonPrimario
            titulo={`Guardar ${tipoActual.titulo}`}
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

  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
    marginBottom: ESPACIADO.sm,
  },

  tiposGrid: { flexDirection: 'row', gap: ESPACIADO.sm },
  tipoCard: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    borderWidth: 2,
    borderColor: COLORES.borde,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  tipoCardActivo: {
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tipoIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.sm,
  },
  tipoTitulo: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: 4,
  },
  tipoDesc: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    lineHeight: 16,
  },
  check: {
    position: 'absolute',
    top: ESPACIADO.sm,
    right: ESPACIADO.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    padding: ESPACIADO.md,
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
});

export default CrearPersona;
