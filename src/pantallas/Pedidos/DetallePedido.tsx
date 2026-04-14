import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PedidosStackParamList } from '../../navegacion/tipos';
import { usePedidoDetalle, usePedidos } from '../../hooks/usePedidos';
import CargandoSpinner from '../../componentes/CargandoSpinner';
import ErrorMensaje from '../../componentes/ErrorMensaje';
import EstadoBadge from '../../componentes/EstadoBadge';
import BotonPrimario from '../../componentes/BotonPrimario';
import CampoTexto from '../../componentes/CampoTexto';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, formatearFecha, parsearNumero } from '../../utilidades/formato';
import { generarYCompartirPDF } from '../../utilidades/pdf';

type Props = NativeStackScreenProps<PedidosStackParamList, 'DetallePedido'>;

const DetallePedido: React.FC<Props> = ({ navigation, route }) => {
  const { pedidoId } = route.params;
  const { pedido, cargando, error, cargar, agregarPago } = usePedidoDetalle(pedidoId);
  const { eliminar } = usePedidos();

  const [modalPago, setModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (pedido) navigation.setOptions({ title: `Pedido #${pedido.id}` });
  }, [pedido, navigation]);

  const handleAgregarPago = async () => {
    const monto = parsearNumero(montoPago);
    if (monto <= 0) {
      Alert.alert('Monto inválido', 'El monto debe ser mayor a 0');
      return;
    }
    if (monto > saldo) {
      Alert.alert(
        'Monto excede el saldo',
        `El máximo a pagar es ${formatearMoneda(saldo)}. ¿Querés pagar el saldo completo?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Pagar saldo completo', onPress: () => setMontoPago(String(saldo)) },
        ],
      );
      return;
    }
    setGuardandoPago(true);
    try {
      await agregarPago({ monto });
      setModalPago(false);
      setMontoPago('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo registrar el pago');
    } finally {
      setGuardandoPago(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!pedido) return;
    setGenerandoPDF(true);
    try {
      await generarYCompartirPDF(pedido);
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert('Eliminar pedido', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminar(pedidoId);
            navigation.goBack();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  if (cargando && !pedido) return <CargandoSpinner />;
  if (error) return <ErrorMensaje mensaje={error} onReintentar={cargar} />;
  if (!pedido) return null;

  const esVenta = pedido.tipo === 'venta';
  const esCliente = pedido.persona?.tipo === 'cliente';
  const resumen = pedido.resumen;
  const total = esCliente ? (resumen?.totalVenta ?? 0) : (resumen?.totalCompra ?? 0);
  const totalPagado = resumen?.totalPagado ?? 0;
  const saldo = Math.max(0, total - totalPagado);
  const estaPagado = resumen?.estado === 'pagado';
  const porcentajePagado = total > 0 ? Math.min(100, Math.round((totalPagado / total) * 100)) : 0;

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero: saldo / estado */}
        <View style={[estilos.heroCard, { backgroundColor: estaPagado ? COLORES.exito : esVenta ? COLORES.primario : COLORES.morado }]}>
          <View style={estilos.heroTop}>
            <View>
              <Text style={estilos.heroPersona}>{pedido.persona?.nombre ?? '—'}</Text>
              <View style={estilos.heroBadgesFila}>
                <View style={estilos.heroBadge}>
                  <Ionicons name={esVenta ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={estilos.heroBadgeTexto}>{esVenta ? 'Venta' : 'Compra'}</Text>
                </View>
                <View style={estilos.heroBadge}>
                  <Ionicons name={esCliente ? 'person-outline' : 'business-outline'} size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={estilos.heroBadgeTexto}>{esCliente ? 'Cliente' : 'Proveedor'}</Text>
                </View>
              </View>
            </View>
            <View style={estilos.heroEstadoBox}>
              <EstadoBadge estado={resumen?.estado ?? 'pendiente'} grande />
            </View>
          </View>

          <View style={estilos.heroMontoFila}>
            <View>
              <Text style={estilos.heroLabel}>{estaPagado ? 'Total cobrado' : 'Saldo pendiente'}</Text>
              <Text style={estilos.heroMonto}>
                {estaPagado ? formatearMoneda(total) : formatearMoneda(saldo)}
              </Text>
            </View>
            <View style={estilos.heroFechaBox}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={estilos.heroFecha}>{formatearFecha(pedido.fecha)}</Text>
            </View>
          </View>

          {/* Barra de progreso */}
          {!estaPagado && total > 0 && (
            <View style={estilos.progresoWrapper}>
              <View style={estilos.progresoBar}>
                <View style={[estilos.progresoFill, { width: `${porcentajePagado}%` as any }]} />
              </View>
              <Text style={estilos.progresoTexto}>
                {formatearMoneda(totalPagado)} pagado · {porcentajePagado}%
              </Text>
            </View>
          )}
        </View>

        {/* Ítems */}
        <View style={estilos.card}>
          <View style={estilos.cardHeader}>
            <Text style={estilos.cardTitulo}>Ítems</Text>
            <View style={estilos.cardCount}>
              <Text style={estilos.cardCountTexto}>{pedido.items?.length ?? 0}</Text>
            </View>
          </View>
          {(pedido.items ?? []).length === 0 ? (
            <View style={estilos.sinDatosBox}>
              <Ionicons name="cube-outline" size={24} color={COLORES.textoDeshabilitado} />
              <Text style={estilos.sinDatos}>Sin ítems registrados</Text>
            </View>
          ) : (
            (pedido.items ?? []).map((item, idx) => {
              const precio = esCliente ? item.precioVenta : item.precioCompra;
              const subtotal = item.cantidad * precio;
              const esUltimo = idx === (pedido.items?.length ?? 0) - 1;
              return (
                <View key={item.id} style={[estilos.itemFila, esUltimo && { borderBottomWidth: 0 }]}>
                  <View style={[estilos.itemIconBox, { backgroundColor: item.tipo === 'bien' ? COLORES.primarioClaro : COLORES.moradoClaro }]}>
                    <Ionicons
                      name={item.tipo === 'bien' ? 'cube-outline' : 'construct-outline'}
                      size={14}
                      color={item.tipo === 'bien' ? COLORES.primario : COLORES.morado}
                    />
                  </View>
                  <View style={estilos.itemInfo}>
                    <Text style={estilos.itemNombre}>{item.nombre}</Text>
                    <Text style={estilos.itemMeta}>
                      {item.cantidad} × {formatearMoneda(precio)}
                    </Text>
                  </View>
                  <Text style={estilos.itemSubtotal}>{formatearMoneda(subtotal)}</Text>
                </View>
              );
            })
          )}
          {(pedido.items ?? []).length > 0 && (
            <View style={estilos.totalFila}>
              <Text style={estilos.totalEtiqueta}>Total</Text>
              <Text style={estilos.totalValor}>{formatearMoneda(total)}</Text>
            </View>
          )}
        </View>

        {/* Pagos */}
        <View style={estilos.card}>
          <View style={estilos.cardHeader}>
            <Text style={estilos.cardTitulo}>Pagos registrados</Text>
            <View style={estilos.cardCount}>
              <Text style={estilos.cardCountTexto}>{pedido.pagos?.length ?? 0}</Text>
            </View>
          </View>
          {(pedido.pagos ?? []).length === 0 ? (
            <View style={estilos.sinDatosBox}>
              <Ionicons name="receipt-outline" size={24} color={COLORES.textoDeshabilitado} />
              <Text style={estilos.sinDatos}>Sin pagos aún</Text>
            </View>
          ) : (
            (pedido.pagos ?? []).map((pago, idx) => {
              const esUltimo = idx === (pedido.pagos?.length ?? 0) - 1;
              return (
                <View key={pago.id} style={[estilos.pagoFila, esUltimo && { borderBottomWidth: 0 }]}>
                  <View style={estilos.pagoIconBox}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORES.exito} />
                  </View>
                  <Text style={estilos.pagoFecha}>{formatearFecha(pago.fecha)}</Text>
                  <Text style={estilos.pagoMonto}>{formatearMoneda(pago.monto)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Eliminar */}
        <TouchableOpacity style={estilos.botonEliminar} onPress={handleEliminar} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={15} color={COLORES.peligro} />
          <Text style={estilos.botonEliminarTexto}>Eliminar pedido</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={estilos.footer}>
        {!estaPagado ? (
          <TouchableOpacity
            style={estilos.botonPagarHero}
            onPress={() => setModalPago(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="cash-outline" size={20} color={COLORES.blanco} />
            <Text style={estilos.botonPagarHeroTexto}>
              Registrar pago · {formatearMoneda(saldo)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={estilos.pagadoBox}>
            <Ionicons name="checkmark-circle" size={18} color={COLORES.exito} />
            <Text style={estilos.pagadoTexto}>Pedido completamente pagado</Text>
          </View>
        )}
        <TouchableOpacity
          style={estilos.botonPDF}
          onPress={handleGenerarPDF}
          activeOpacity={0.85}
          disabled={generandoPDF}
        >
          {generandoPDF ? (
            <ActivityIndicator color={COLORES.primario} size="small" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color={COLORES.primario} />
              <Text style={estilos.botonPDFTexto}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal pago */}
      <Modal visible={modalPago} animationType="slide" transparent>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContenido}>
            <View style={estilos.modalHandle} />
            <View style={estilos.modalHeader}>
              <View style={estilos.modalIconBox}>
                <Ionicons name="cash-outline" size={22} color={COLORES.exito} />
              </View>
              <View>
                <Text style={estilos.modalTitulo}>Registrar pago</Text>
                <Text style={estilos.modalSubtitulo}>Saldo pendiente: {formatearMoneda(saldo)}</Text>
              </View>
            </View>
            <CampoTexto
              etiqueta="Monto a pagar"
              placeholder="0.00"
              value={montoPago}
              onChangeText={setMontoPago}
              keyboardType="decimal-pad"
              icono="cash-outline"
              autoFocus
              ayuda={`Máximo: ${formatearMoneda(saldo)}`}
            />
            <View style={estilos.modalBotones}>
              <BotonPrimario
                titulo="Cancelar"
                onPress={() => { setModalPago(false); setMontoPago(''); }}
                variante="secundario"
                estilo={{ flex: 1, marginRight: ESPACIADO.sm }}
              />
              <BotonPrimario
                titulo="Guardar"
                onPress={handleAgregarPago}
                cargando={guardandoPago}
                estilo={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  scroll: { paddingBottom: ESPACIADO.xxl },

  heroCard: {
    margin: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ESPACIADO.md,
  },
  heroPersona: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroBadgesFila: { flexDirection: 'row', gap: ESPACIADO.xs },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIO.full,
    paddingHorizontal: ESPACIADO.sm,
    paddingVertical: 3,
  },
  heroBadgeTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.blanco },
  heroEstadoBox: { marginLeft: ESPACIADO.sm },

  heroMontoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: ESPACIADO.sm,
  },
  heroLabel: {
    fontSize: FUENTE.tamanoPequeno,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  heroMonto: {
    fontSize: FUENTE.tamanoXxl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.blanco,
    letterSpacing: -1,
  },
  heroFechaBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  heroFecha: { fontSize: FUENTE.tamanoXs, color: 'rgba(255,255,255,0.8)' },

  progresoWrapper: { marginTop: ESPACIADO.xs },
  progresoBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progresoFill: {
    height: '100%',
    backgroundColor: COLORES.blanco,
    borderRadius: 3,
  },
  progresoTexto: { fontSize: FUENTE.tamanoXs, color: 'rgba(255,255,255,0.85)' },

  card: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginHorizontal: ESPACIADO.md,
    marginBottom: ESPACIADO.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ESPACIADO.sm,
  },
  cardTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  cardCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORES.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cardCountTexto: { fontSize: FUENTE.tamanoXs, fontWeight: FUENTE.pesoBold, color: COLORES.textoSecundario },

  itemFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ESPACIADO.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
    gap: ESPACIADO.sm,
  },
  itemIconBox: {
    width: 30,
    height: 30,
    borderRadius: RADIO.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemNombre: { fontSize: FUENTE.tamanoBase, color: COLORES.texto, fontWeight: FUENTE.pesoMedio },
  itemMeta: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginTop: 2 },
  itemSubtotal: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: ESPACIADO.sm,
    marginTop: ESPACIADO.xs,
    borderTopWidth: 1.5,
    borderTopColor: COLORES.borde,
  },
  totalEtiqueta: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  totalValor: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },

  sinDatosBox: { alignItems: 'center', paddingVertical: ESPACIADO.lg, gap: ESPACIADO.xs },
  sinDatos: { fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario },

  pagoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ESPACIADO.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
    gap: ESPACIADO.sm,
  },
  pagoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.exitoClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagoFecha: { flex: 1, fontSize: FUENTE.tamanoBase, color: COLORES.textoSecundario },
  pagoMonto: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.exito },

  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.xs,
    padding: ESPACIADO.md,
    marginHorizontal: ESPACIADO.md,
    marginBottom: ESPACIADO.xs,
  },
  botonEliminarTexto: { fontSize: FUENTE.tamanoPequeno, color: COLORES.peligro, fontWeight: FUENTE.pesoMedio },

  footer: {
    flexDirection: 'row',
    padding: ESPACIADO.md,
    backgroundColor: COLORES.fondo,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    gap: ESPACIADO.sm,
  },
  botonPagarHero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORES.exito,
    borderRadius: RADIO.lg,
    paddingVertical: ESPACIADO.md,
  },
  botonPagarHeroTexto: { color: COLORES.blanco, fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold },
  pagadoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORES.exitoClaro,
    borderRadius: RADIO.lg,
    paddingVertical: ESPACIADO.md,
  },
  pagadoTexto: { color: COLORES.exito, fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold },
  botonPDF: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORES.primarioClaro,
    borderRadius: RADIO.lg,
    paddingHorizontal: ESPACIADO.md,
    minWidth: 78,
    justifyContent: 'center',
  },
  botonPDFTexto: { fontSize: FUENTE.tamanoPequeno, color: COLORES.primario, fontWeight: FUENTE.pesoBold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContenido: {
    backgroundColor: COLORES.tarjeta,
    borderTopLeftRadius: RADIO.xxl,
    borderTopRightRadius: RADIO.xxl,
    padding: ESPACIADO.lg,
    paddingBottom: ESPACIADO.xxl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.borde,
    alignSelf: 'center',
    marginBottom: ESPACIADO.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.exitoClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  modalSubtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginTop: 2 },
  modalBotones: { flexDirection: 'row', marginTop: ESPACIADO.xs },
});

export default DetallePedido;
