import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PedidosStackParamList } from '../../navegacion/tipos';
import { usePedidos } from '../../hooks/usePedidos';
import { usePersonas } from '../../hooks/usePersonas';
import { TipoPedido, TipoItem, CrearItemDto, Persona } from '../../tipos';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import SelectorToggle from '../../componentes/SelectorToggle';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { parsearNumero } from '../../utilidades/formato';

type Props = NativeStackScreenProps<PedidosStackParamList, 'CrearPedido'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ItemForm {
  id: string;
  tipo: TipoItem;
  nombre: string;
  cantidad: string;
  precioCompra: string;
  precioVenta: string;
}

const nuevoItem = (): ItemForm => ({
  id: String(Date.now() + Math.random()),
  tipo: 'bien',
  nombre: '',
  cantidad: '1',
  precioCompra: '',
  precioVenta: '',
});

const OPCIONES_TIPO_ITEM: { valor: TipoItem; etiqueta: string }[] = [
  { valor: 'bien', etiqueta: 'Producto' },
  { valor: 'servicio', etiqueta: 'Servicio' },
];

// ─── Selector visual de tipo de pedido ───────────────────────────────────────
interface ConfigTipo {
  valor: TipoPedido;
  titulo: string;
  descripcion: string;
  icono: IoniconName;
  color: string;
  fondo: string;
}

const TIPOS_PEDIDO: ConfigTipo[] = [
  {
    valor: 'venta',
    titulo: 'Venta',
    descripcion: 'Vendí algo a un cliente',
    icono: 'arrow-up-circle',
    color: COLORES.primario,
    fondo: COLORES.primarioClaro,
  },
  {
    valor: 'compra',
    titulo: 'Compra',
    descripcion: 'Compré algo a un proveedor',
    icono: 'arrow-down-circle',
    color: COLORES.morado,
    fondo: COLORES.moradoClaro,
  },
];

const SelectorTipoPedido: React.FC<{
  valor: TipoPedido;
  onChange: (v: TipoPedido) => void;
}> = ({ valor, onChange }) => (
  <View style={estilosTipo.contenedor}>
    <Text style={estilosTipo.etiqueta}>Tipo</Text>
    <View style={estilosTipo.grupo}>
      {TIPOS_PEDIDO.map((tipo) => {
        const activo = valor === tipo.valor;
        return (
          <TouchableOpacity
            key={tipo.valor}
            style={[
              estilosTipo.opcion,
              activo && { borderColor: tipo.color, backgroundColor: tipo.fondo },
            ]}
            onPress={() => onChange(tipo.valor)}
            activeOpacity={0.85}
          >
            <View style={[estilosTipo.iconBox, { backgroundColor: activo ? tipo.color : COLORES.grisClaro }]}>
              <Ionicons name={tipo.icono} size={22} color={activo ? COLORES.blanco : COLORES.textoSecundario} />
            </View>
            <Text style={[estilosTipo.titulo, activo && { color: tipo.color }]}>{tipo.titulo}</Text>
            <Text style={estilosTipo.descripcion}>{tipo.descripcion}</Text>
            {activo && (
              <View style={[estilosTipo.check, { backgroundColor: tipo.color }]}>
                <Ionicons name="checkmark" size={11} color={COLORES.blanco} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const estilosTipo = StyleSheet.create({
  contenedor: { marginBottom: ESPACIADO.md },
  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grupo: { flexDirection: 'row', gap: ESPACIADO.sm },
  opcion: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORES.borde,
    position: 'relative',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACIADO.sm,
  },
  titulo: {
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    marginBottom: 3,
  },
  descripcion: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    textAlign: 'center',
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
});
// ─────────────────────────────────────────────────────────────────────────────

const CrearPedido: React.FC<Props> = ({ navigation, route }) => {
  const { crear } = usePedidos();
  const { personas, cargar: cargarPersonas } = usePersonas();
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>('venta');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
  const [modalPersona, setModalPersona] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([nuevoItem()]);
  const [pagoInicial, setPagoInicial] = useState('');
  const [mostrarPago, setMostrarPago] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargarPersonas(); }, [cargarPersonas]);

  useEffect(() => {
    if (route.params?.personaId) {
      const p = personas.find((x) => x.id === route.params.personaId);
      if (p) {
        setPersonaSeleccionada(p);
        setTipoPedido(p.tipo === 'cliente' ? 'venta' : 'compra');
      }
    }
  }, [route.params?.personaId, personas]);

  // Bug fix: resetear persona si ya no es compatible con el nuevo tipo de pedido
  useEffect(() => {
    if (!personaSeleccionada) return;
    const incompatible =
      (tipoPedido === 'venta' && personaSeleccionada.tipo !== 'cliente') ||
      (tipoPedido === 'compra' && personaSeleccionada.tipo !== 'proveedor');
    if (incompatible) setPersonaSeleccionada(null);
  }, [tipoPedido]);

  const actualizarItem = useCallback((id: string, campo: keyof ItemForm, valor: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }, []);

  const agregarItem = useCallback(() => setItems((prev) => [...prev, nuevoItem()]), []);

  const eliminarItem = useCallback((id: string) => {
    setItems((prev) => prev.length <= 1 ? prev : prev.filter((it) => it.id !== id));
  }, []);

  const validar = (): boolean => {
    if (!personaSeleccionada) {
      Alert.alert('Falta la persona', `Seleccioná el ${tipoPedido === 'venta' ? 'cliente' : 'proveedor'}`);
      return false;
    }
    for (const item of items) {
      if (!item.nombre.trim()) {
        Alert.alert('Nombre requerido', 'Todos los ítems deben tener un nombre');
        return false;
      }
      if (parsearNumero(item.cantidad) <= 0) {
        Alert.alert('Cantidad inválida', 'La cantidad debe ser mayor a 0');
        return false;
      }
      // Validar que el precio relevante no sea 0
      const precio = tipoPedido === 'venta' ? parsearNumero(item.precioVenta) : parsearNumero(item.precioCompra);
      if (precio <= 0) {
        Alert.alert('Precio requerido', `El precio de "${item.nombre || 'ítem'}" debe ser mayor a 0`);
        return false;
      }
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const itemsDto: CrearItemDto[] = items.map((it) => ({
        tipo: it.tipo,
        nombre: it.nombre.trim(),
        cantidad: parsearNumero(it.cantidad),
        precioCompra: parsearNumero(it.precioCompra),
        precioVenta: parsearNumero(it.precioVenta),
      }));
      const montoInicial = parsearNumero(pagoInicial);
      const pedido = await crear({
        personaId: personaSeleccionada!.id,
        tipo: tipoPedido,
        items: itemsDto,
        pagoInicial: mostrarPago && montoInicial > 0 ? { monto: montoInicial } : undefined,
      });
      navigation.replace('DetallePedido', { pedidoId: pedido.id });
    } catch (e: unknown) {
      Alert.alert('Error al crear pedido', e instanceof Error ? e.message : 'Intentá nuevamente');
    } finally {
      setGuardando(false);
    }
  };

  // Personas filtradas según el tipo de pedido seleccionado
  const personasFiltradas = personas.filter((p) =>
    tipoPedido === 'venta' ? p.tipo === 'cliente' : p.tipo === 'proveedor'
  );
  // Si no hay ninguna del tipo correcto, mostramos todas
  const personasModal = personasFiltradas.length > 0 ? personasFiltradas : personas;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tipo de pedido */}
          <SelectorTipoPedido valor={tipoPedido} onChange={setTipoPedido} />

          {/* Selector persona */}
          <Text style={estilos.etiqueta}>
            {tipoPedido === 'venta' ? 'Cliente' : 'Proveedor'}
          </Text>
          <TouchableOpacity
            style={[
              estilos.selectorPersona,
              !personaSeleccionada && estilos.selectorPersonaVacio,
            ]}
            onPress={() => setModalPersona(true)}
            activeOpacity={0.85}
          >
            {personaSeleccionada ? (
              <View style={estilos.personaSeleccionada}>
                <View style={[estilos.avatarPequeno, {
                  backgroundColor: personaSeleccionada.tipo === 'cliente' ? COLORES.clienteClaro : COLORES.proveedorClaro,
                }]}>
                  <Text style={[estilos.avatarLetra, {
                    color: personaSeleccionada.tipo === 'cliente' ? COLORES.cliente : COLORES.proveedor,
                  }]}>
                    {personaSeleccionada.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.personaNombre}>{personaSeleccionada.nombre}</Text>
                  <Text style={estilos.personaTipo}>
                    {personaSeleccionada.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}
                  </Text>
                </View>
                <View style={estilos.cambiarBtn}>
                  <Text style={estilos.cambiarTexto}>Cambiar</Text>
                </View>
              </View>
            ) : (
              <View style={estilos.personaPlaceholder}>
                <View style={estilos.placeholderIcon}>
                  <Ionicons
                    name={tipoPedido === 'venta' ? 'person-add-outline' : 'business-outline'}
                    size={20}
                    color={COLORES.textoDeshabilitado}
                  />
                </View>
                <Text style={estilos.placeholderTexto}>
                  {tipoPedido === 'venta' ? 'Seleccioná el cliente' : 'Seleccioná el proveedor'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={COLORES.textoDeshabilitado} />
              </View>
            )}
          </TouchableOpacity>

          {/* Ítems */}
          <View style={estilos.seccionHeader}>
            <Text style={estilos.etiqueta}>Ítems</Text>
            <Text style={estilos.itemsContador}>{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</Text>
          </View>

          {items.map((item, idx) => (
            <View key={item.id} style={estilos.itemCard}>
              <View style={estilos.itemCardHeader}>
                <View style={estilos.itemNumeroBox}>
                  <Ionicons name="cube-outline" size={14} color={COLORES.primario} />
                  <Text style={estilos.itemNumero}>Ítem {idx + 1}</Text>
                </View>
                {items.length > 1 && (
                  <TouchableOpacity style={estilos.eliminarBtn} onPress={() => eliminarItem(item.id)} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={14} color={COLORES.peligro} />
                    <Text style={estilos.eliminarTexto}>Quitar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <SelectorToggle
                opciones={OPCIONES_TIPO_ITEM}
                valorSeleccionado={item.tipo}
                onSeleccionar={(v) => actualizarItem(item.id, 'tipo', v)}
              />

              <CampoTexto
                etiqueta="Nombre"
                placeholder={item.tipo === 'bien' ? 'Ej: Remera talle M' : 'Ej: Corte de cabello'}
                value={item.nombre}
                onChangeText={(v) => actualizarItem(item.id, 'nombre', v)}
                maxLength={150}
              />

              <View style={estilos.filaInputs}>
                <CampoTexto
                  etiqueta="Cantidad"
                  placeholder="1"
                  value={item.cantidad}
                  onChangeText={(v) => actualizarItem(item.id, 'cantidad', v)}
                  keyboardType="decimal-pad"
                  contenedor={{ flex: 1, marginRight: ESPACIADO.sm }}
                />
                <CampoTexto
                  etiqueta="Precio"
                  placeholder="0.00"
                  value={tipoPedido === 'venta' ? item.precioVenta : item.precioCompra}
                  onChangeText={(v) => actualizarItem(item.id, tipoPedido === 'venta' ? 'precioVenta' : 'precioCompra', v)}
                  keyboardType="decimal-pad"
                  contenedor={{ flex: 1, marginLeft: ESPACIADO.sm }}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={estilos.botonAgregarItem} onPress={agregarItem} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={18} color={COLORES.primario} />
            <Text style={estilos.botonAgregarItemTexto}>Agregar otro ítem</Text>
          </TouchableOpacity>

          {/* Pago inicial */}
          <TouchableOpacity style={estilos.togglePago} onPress={() => setMostrarPago((v) => !v)} activeOpacity={0.8}>
            <View style={[estilos.checkbox, mostrarPago && estilos.checkboxActivo]}>
              {mostrarPago && <Ionicons name="checkmark" size={13} color={COLORES.blanco} />}
            </View>
            <Text style={estilos.togglePagoTitulo}>Agregar pago inicial</Text>
          </TouchableOpacity>

          {mostrarPago && (
            <CampoTexto
              etiqueta="Monto pagado"
              placeholder="0.00"
              value={pagoInicial}
              onChangeText={setPagoInicial}
              keyboardType="decimal-pad"
              icono="cash-outline"
            />
          )}
        </ScrollView>

        <View style={estilos.footer}>
          <BotonPrimario titulo="Crear Pedido" onPress={handleGuardar} cargando={guardando} />
        </View>
      </KeyboardAvoidingView>

      {/* Modal personas */}
      <Modal visible={modalPersona} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
          <View style={estilos.modalHeader}>
            <View>
              <Text style={estilos.modalTitulo}>
                {tipoPedido === 'venta' ? 'Seleccioná el cliente' : 'Seleccioná el proveedor'}
              </Text>
              <Text style={estilos.modalSubtitulo}>
                {personasModal.length} {tipoPedido === 'venta' ? 'clientes' : 'proveedores'} disponibles
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalPersona(false)} style={estilos.modalCerrarBtn}>
              <Ionicons name="close" size={20} color={COLORES.textoSecundario} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={personasModal}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={estilos.modalItem}
                onPress={() => { setPersonaSeleccionada(item); setModalPersona(false); }}
                activeOpacity={0.85}
              >
                <View style={[estilos.avatarPequeno, {
                  backgroundColor: item.tipo === 'cliente' ? COLORES.clienteClaro : COLORES.proveedorClaro,
                }]}>
                  <Text style={[estilos.avatarLetra, {
                    color: item.tipo === 'cliente' ? COLORES.cliente : COLORES.proveedor,
                  }]}>
                    {item.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.personaNombre}>{item.nombre}</Text>
                  <Text style={estilos.personaTipo}>{item.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORES.textoDeshabilitado} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORES.borde, marginHorizontal: ESPACIADO.md }} />}
            contentContainerStyle={{ padding: ESPACIADO.md }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: ESPACIADO.xl, gap: ESPACIADO.sm }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORES.grisClaro, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people-outline" size={30} color={COLORES.textoDeshabilitado} />
                </View>
                <Text style={{ color: COLORES.texto, fontWeight: FUENTE.pesoSemibold, fontSize: FUENTE.tamanoBase }}>
                  Sin {tipoPedido === 'venta' ? 'clientes' : 'proveedores'}
                </Text>
                <Text style={{ color: COLORES.textoSecundario, textAlign: 'center', fontSize: FUENTE.tamanoPequeno }}>
                  Agregá {tipoPedido === 'venta' ? 'un cliente' : 'un proveedor'} primero
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xl },
  etiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorPersona: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    marginBottom: ESPACIADO.md,
    overflow: 'hidden',
  },
  selectorPersonaVacio: {
    borderStyle: 'dashed',
  },
  personaSeleccionada: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ESPACIADO.md,
    gap: ESPACIADO.sm,
  },
  personaPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ESPACIADO.md,
    gap: ESPACIADO.sm,
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTexto: {
    flex: 1,
    color: COLORES.textoDeshabilitado,
    fontSize: FUENTE.tamanoBase,
  },
  avatarPequeno: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold },
  personaNombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  personaTipo: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  cambiarBtn: {
    backgroundColor: COLORES.grisClaro,
    borderRadius: RADIO.full,
    paddingVertical: 4,
    paddingHorizontal: ESPACIADO.sm,
  },
  cambiarTexto: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, fontWeight: FUENTE.pesoMedio },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACIADO.xs,
    marginTop: ESPACIADO.sm,
  },
  itemsContador: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },
  itemCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ESPACIADO.md,
  },
  itemNumeroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.sm,
    paddingVertical: 4,
    paddingHorizontal: ESPACIADO.sm,
  },
  itemNumero: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.primario },
  eliminarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORES.peligroClaro,
    borderRadius: RADIO.sm,
    paddingVertical: 4,
    paddingHorizontal: ESPACIADO.sm,
  },
  eliminarTexto: { fontSize: FUENTE.tamanoPequeno, color: COLORES.peligro },
  filaInputs: { flexDirection: 'row' },
  botonAgregarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    borderWidth: 1.5,
    borderColor: COLORES.primario,
    borderStyle: 'dashed',
    borderRadius: RADIO.lg,
    paddingVertical: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
    backgroundColor: COLORES.primarioClaro,
  },
  botonAgregarItemTexto: { color: COLORES.primario, fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold },
  togglePago: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.sm,
    marginBottom: ESPACIADO.md,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORES.bordeOscuro,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.grisClaro,
  },
  checkboxActivo: { backgroundColor: COLORES.primario, borderColor: COLORES.primario },
  togglePagoTitulo: { fontSize: FUENTE.tamanoBase, color: COLORES.texto, fontWeight: FUENTE.pesoMedio },
  footer: {
    padding: ESPACIADO.md,
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ESPACIADO.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  modalTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  modalSubtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginTop: 2 },
  modalCerrarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    paddingVertical: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.sm,
  },
});

export default CrearPedido;
