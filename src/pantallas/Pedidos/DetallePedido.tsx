import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { estilos } from './DetallePedido.estilos';
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
  const total = esVenta ? (resumen?.totalVenta ?? 0) : (resumen?.totalCompra ?? 0);
  const totalPagado = resumen?.totalPagado ?? 0;
  const saldo = resumen?.saldoPendiente ?? Math.max(0, total - totalPagado);
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
              const precio = esVenta ? item.precioVenta : item.precioCompra;
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


export default DetallePedido;
