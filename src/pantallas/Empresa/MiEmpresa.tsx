import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { perfilServicio, PerfilEmpresa } from '../../servicios/perfil.servicio';
import { useWallet } from '../../contexto/WalletContext';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';

const MiEmpresa: React.FC = () => {
  const { walletSeleccionado } = useWallet();
  const [perfil, setPerfil] = useState<Partial<PerfilEmpresa>>({});
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const wid = walletSeleccionado?.id;
    if (wid == null) {
      setPerfil({});
      setCargandoPerfil(false);
      return;
    }
    setCargandoPerfil(true);
    try {
      const data = await perfilServicio.obtener(wid);
      setPerfil(data);
    } catch {
      // sin perfil aún
    } finally {
      setCargandoPerfil(false);
    }
  }, [walletSeleccionado?.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const seleccionarLogo = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      mostrarAlerta('Permiso requerido', 'Necesitás permitir el acceso a tus fotos');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: false,
      quality: 0.88,
      base64: true,
    });
    if (!resultado.canceled && resultado.assets[0].base64) {
      const asset = resultado.assets[0];
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
      setPerfil((prev) => ({ ...prev, logoBase64: `${prefijo}${asset.base64}` }));
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const wid = walletSeleccionado?.id;
      if (wid == null) return;
      const actualizado = await perfilServicio.actualizar(wid, {
        nombreEmpresa: perfil.nombreEmpresa ?? undefined,
        logoBase64: perfil.logoBase64 ?? undefined,
        direccion: perfil.direccion ?? undefined,
        email: perfil.email ?? undefined,
        telefono: perfil.telefono ?? undefined,
        nit: perfil.nit ?? undefined,
      });
      setPerfil(actualizado);
      mostrarAlerta('Guardado', 'Perfil de empresa actualizado');
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoPerfil) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.fondo }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[estilos.scroll, { paddingBottom: SCROLL_FORM_PADDING_BOTTOM }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <Text style={estilos.titulo}>Mi empresa</Text>
        <Text style={estilos.subtitulo}>Estos datos aparecen en tus PDFs y cotizaciones</Text>

        {/* Logo */}
        <View style={estilos.logoSeccion}>
          <TouchableOpacity style={estilos.logoContenedor} onPress={seleccionarLogo} activeOpacity={0.85}>
            {perfil.logoUrl || perfil.logoBase64 ? (
              <Image
                source={{ uri: (perfil.logoUrl || perfil.logoBase64) as string }}
                style={estilos.logoImagen}
                resizeMode="contain"
              />
            ) : (
              <View style={estilos.logoPlaceholder}>
                <Ionicons name="image-outline" size={32} color={COLORES.textoDeshabilitado} />
                <Text style={estilos.logoTexto}>Subir logo</Text>
              </View>
            )}
            <View style={estilos.logoEditarBtn}>
              <Ionicons name="camera-outline" size={14} color={COLORES.blanco} />
            </View>
          </TouchableOpacity>
          <Text style={estilos.logoAyuda}>Imagen completa (sin recorte) · JPG o PNG · PNG si el logo tiene fondo transparente</Text>
          {(perfil.logoUrl || perfil.logoBase64) && (
            <TouchableOpacity
              style={estilos.quitarLogoBtn}
              onPress={async () => {
                setGuardando(true);
                try {
                  const wid = walletSeleccionado?.id;
                  if (wid == null) return;
                  const actualizado = await perfilServicio.actualizar(wid, { eliminarLogo: true });
                  setPerfil(actualizado);
                  mostrarAlerta('Listo', 'Se quitó el logo de tu empresa');
                } catch (e: unknown) {
                  mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo quitar el logo');
                } finally {
                  setGuardando(false);
                }
              }}
              disabled={guardando}
            >
              <Text style={estilos.quitarLogoTexto}>Quitar logo</Text>
            </TouchableOpacity>
          )}
        </View>

        <CampoTexto
          etiqueta="Nombre de la empresa"
          placeholder="Ej: Mi Empresa S.A."
          value={perfil.nombreEmpresa ?? ''}
          onChangeText={(v) => setPerfil((p) => ({ ...p, nombreEmpresa: v }))}
          icono="business-outline"
        />
        <CampoTexto
          etiqueta="Dirección"
          placeholder="Ej: Calle 1 #23, Ciudad"
          value={perfil.direccion ?? ''}
          onChangeText={(v) => setPerfil((p) => ({ ...p, direccion: v }))}
          icono="location-outline"
        />
        <CampoTexto
          etiqueta="Email de la empresa"
          placeholder="empresa@email.com"
          value={perfil.email ?? ''}
          onChangeText={(v) => setPerfil((p) => ({ ...p, email: v }))}
          keyboardType="email-address"
          autoCapitalize="none"
          icono="mail-outline"
        />
        <CampoTexto
          etiqueta="Teléfono"
          placeholder="Ej: +502 3012 3456"
          value={perfil.telefono ?? ''}
          onChangeText={(v) => setPerfil((p) => ({ ...p, telefono: v }))}
          keyboardType="phone-pad"
          icono="call-outline"
        />
        <CampoTexto
          etiqueta="NIT"
          placeholder="Ej: 1234567-8"
          value={perfil.nit ?? ''}
          onChangeText={(v) => setPerfil((p) => ({ ...p, nit: v }))}
          icono="document-text-outline"
        />

        <BotonPrimario titulo="Guardar cambios" onPress={guardar} cargando={guardando} estilo={{ marginTop: ESPACIADO.sm }} />

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { padding: ESPACIADO.lg, paddingTop: ESPACIADO.md },
  titulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginBottom: 4 },
  subtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginBottom: ESPACIADO.lg },
  logoSeccion: { alignItems: 'center', marginBottom: ESPACIADO.lg },
  logoContenedor: {
    width: 100, height: 100, borderRadius: RADIO.xl, backgroundColor: COLORES.grisClaro,
    borderWidth: 2, borderColor: COLORES.borde, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  logoImagen: { width: 96, height: 96, borderRadius: RADIO.xl },
  logoPlaceholder: { alignItems: 'center', gap: 4 },
  logoTexto: { fontSize: FUENTE.tamanoXs, color: COLORES.textoDeshabilitado },
  logoEditarBtn: {
    position: 'absolute', bottom: -4, right: -4,
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORES.primario,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORES.fondo,
  },
  logoAyuda: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: ESPACIADO.sm },
  quitarLogoBtn: { marginTop: ESPACIADO.sm, paddingVertical: 6, paddingHorizontal: ESPACIADO.md },
  quitarLogoTexto: { fontSize: FUENTE.tamanoXs, color: COLORES.peligro, fontWeight: FUENTE.pesoSemibold },
});

export default MiEmpresa;
