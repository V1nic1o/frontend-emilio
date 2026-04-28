import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CatalogoStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { useCarritoCatalogoPedido } from '../../contexto/CarritoCatalogoContext';
import { productosServicio } from '../../servicios/productos.servicio';
import { Producto } from '../../tipos';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, estilosComunes } from '../../estilos/tema';
import { formatearMoneda, parsearNumero } from '../../utilidades/formato';
import { mostrarAlerta } from '../../utilidades/alertaPlataforma';

type Props = NativeStackScreenProps<CatalogoStackParamList, 'AgregarSeleccionCatalogo'>;

function ordenarPorIds(productos: Producto[], ids: number[]): Producto[] {
  const map = new Map(productos.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter((p): p is Producto => p != null);
}

const MAX_CANT_SELECCION = 9_999_999;

function cantidadATexto(c: number): string {
  if (Number.isInteger(c)) return String(c);
  return String(c);
}

/** Campo numérico alineado con el carrito del catálogo: escribir cantidad grande o usar ±. */
const CantidadSeleccionEditable: React.FC<{
  productoId: number;
  cantidad: number;
  onFijar: (productoId: number, valor: number) => void;
}> = React.memo(({ productoId, cantidad, onFijar }) => {
  const [texto, setTexto] = useState(() => cantidadATexto(cantidad));

  useEffect(() => {
    setTexto(cantidadATexto(cantidad));
  }, [cantidad]);

  const aplicar = () => {
    const n = parsearNumero(texto);
    if (n <= 0) {
      setTexto(cantidadATexto(cantidad));
      return;
    }
    const c = Math.min(Math.floor(n), MAX_CANT_SELECCION);
    const final = Math.max(1, c);
    onFijar(productoId, final);
    setTexto(cantidadATexto(final));
  };

  return (
    <TextInput
      style={estilos.cantInput}
      value={texto}
      onChangeText={setTexto}
      onBlur={aplicar}
      onSubmitEditing={aplicar}
      keyboardType="decimal-pad"
      selectTextOnFocus
      returnKeyType="done"
      maxLength={12}
    />
  );
});

const AgregarSeleccionCatalogo: React.FC<Props> = ({ navigation, route }) => {
  const { productoIds } = route.params;
  const { walletSeleccionado } = useWallet();
  const { agregarProducto, marcarTransferenciaAlPedido } = useCarritoCatalogoPedido();

  const [items, setItems] = useState<Producto[]>([]);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productoIds.length === 0) {
      navigation.goBack();
    }
  }, [productoIds.length, navigation]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!walletSeleccionado || productoIds.length === 0) {
        setCargando(false);
        return;
      }
      setCargando(true);
      setError(null);
      try {
        const data = await productosServicio.listarPorWallet(walletSeleccionado.id);
        if (cancelado) return;
        const ordenados = ordenarPorIds(data, productoIds);
        setItems(ordenados);
        const init: Record<number, number> = {};
        ordenados.forEach((p) => {
          init[p.id] = 1;
        });
        setCantidades(init);
        if (ordenados.length < productoIds.length) {
          mostrarAlerta(
            'Algunos ítems ya no están',
            'Se quitaron del catálogo productos que habías elegido; se muestran solo los que siguen disponibles.',
          );
        }
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [walletSeleccionado, productoIds]);

  const ajustarCant = useCallback((productoId: number, delta: number) => {
    setCantidades((prev) => {
      const actual = prev[productoId] ?? 1;
      const n = Math.min(MAX_CANT_SELECCION, Math.max(1, actual + delta));
      return { ...prev, [productoId]: n };
    });
  }, []);

  const fijarCantidad = useCallback((productoId: number, valor: number) => {
    const c = Math.min(MAX_CANT_SELECCION, Math.max(1, Math.floor(valor)));
    setCantidades((prev) => ({ ...prev, [productoId]: c }));
  }, []);

  const confirmar = useCallback(() => {
    if (items.length === 0) return;
    items.forEach((p) => {
      const c = cantidades[p.id] ?? 1;
      if (c > 0) agregarProducto(p, c);
    });
    marcarTransferenciaAlPedido();
    // Dejar que React confirme las líneas en el contexto (lineasRef) antes de consumirlas en CrearPedido.
    setTimeout(() => {
      navigation.popToTop();
      navigation.navigate('CatalogoProductos', { limpiarSeleccion: true });
      navigation.dispatch(
        CommonActions.navigate({
          name: 'PedidosTab',
          params: {
            screen: 'CrearPedido',
            params: {},
          },
        }),
      );
    }, 0);
  }, [items, cantidades, agregarProducto, marcarTransferenciaAlPedido, navigation]);

  const totalUnidades = useMemo(
    () => items.reduce((acc, p) => acc + (cantidades[p.id] ?? 1), 0),
    [items, cantidades],
  );

  if (cargando) {
    return (
      <View style={[estilosComunes.contenedor, estilos.centrado]}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={estilos.cargandoTxt}>Cargando selección…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
        <View style={estilos.centrado}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORES.peligro} />
          <Text style={estilos.errorTxt}>{error}</Text>
          <TouchableOpacity style={estilos.btnReintentar} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={estilos.btnReintentarTxt}>Volver al catálogo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
        <View style={estilos.centrado}>
          <Ionicons name="cart-outline" size={48} color={COLORES.textoDeshabilitado} />
          <Text style={estilos.vacioTitulo}>Nada para agregar</Text>
          <Text style={estilos.vacioSub}>Volvé al catálogo y elegí productos o servicios.</Text>
          <TouchableOpacity style={estilos.btnReintentar} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={estilos.btnReintentarTxt}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilosComunes.contenedor} edges={['bottom']}>
      <Text style={estilos.subtitulo}>
        Ajustá las cantidades (podés escribir el número o usar +/−). Al confirmar se suman al carrito y se abre el mismo
        formulario de pedido que desde el catálogo: cliente o proveedor e importes.
      </Text>
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.scrollContent} keyboardShouldPersistTaps="handled">
        {items.map((p) => {
          const esBien = p.tipo === 'bien';
          const color = esBien ? COLORES.primario : COLORES.morado;
          const cant = cantidades[p.id] ?? 1;
          return (
            <View key={p.id} style={estilos.fila}>
              <View style={[estilos.avatar, { backgroundColor: color }]}>
                <Text style={estilos.avatarTxt}>{p.nombre.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={estilos.filaBody}>
                <Text style={estilos.nombre} numberOfLines={2}>
                  {p.nombre}
                </Text>
                <Text style={estilos.precio}>{formatearMoneda(p.precioEmpresa)} venta</Text>
                <View style={estilos.stepper}>
                  <TouchableOpacity
                    style={estilos.stepBtn}
                    onPress={() => ajustarCant(p.id, -1)}
                    hitSlop={6}
                    accessibilityLabel="Menos una unidad"
                  >
                    <Ionicons name="remove" size={20} color={COLORES.primario} />
                  </TouchableOpacity>
                  <CantidadSeleccionEditable productoId={p.id} cantidad={cant} onFijar={fijarCantidad} />
                  <TouchableOpacity
                    style={estilos.stepBtn}
                    onPress={() => ajustarCant(p.id, 1)}
                    hitSlop={6}
                    accessibilityLabel="Más una unidad"
                  >
                    <Ionicons name="add" size={20} color={COLORES.primario} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={estilos.pie}>
        <Text style={estilos.pieResumen}>
          {items.length} {items.length === 1 ? 'ítem' : 'ítes'} · {totalUnidades}{' '}
          {totalUnidades === 1 ? 'unidad' : 'unidades'}
        </Text>
        <BotonPrimario titulo="Cliente / proveedor e importes" onPress={confirmar} />
      </View>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACIADO.xl, gap: ESPACIADO.sm },
  cargandoTxt: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginTop: ESPACIADO.sm },
  errorTxt: { fontSize: FUENTE.tamanoBase, color: COLORES.texto, textAlign: 'center' },
  vacioTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto, marginTop: ESPACIADO.sm },
  vacioSub: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
  btnReintentar: { marginTop: ESPACIADO.md, paddingVertical: ESPACIADO.sm, paddingHorizontal: ESPACIADO.lg },
  btnReintentarTxt: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold, color: COLORES.primario },
  subtitulo: {
    fontSize: FUENTE.tamanoXs,
    color: COLORES.textoSecundario,
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.xs,
    lineHeight: 18,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: ESPACIADO.md, paddingBottom: ESPACIADO.md },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.blanco },
  filaBody: { flex: 1, minWidth: 0, gap: 4 },
  nombre: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  precio: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: ESPACIADO.xs },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  cantInput: {
    minWidth: 64,
    maxWidth: 112,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.sm,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  pie: {
    paddingHorizontal: ESPACIADO.md,
    paddingTop: ESPACIADO.sm,
    paddingBottom: ESPACIADO.md,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
    backgroundColor: COLORES.tarjeta,
    gap: ESPACIADO.sm,
  },
  pieResumen: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, textAlign: 'center' },
});

export default AgregarSeleccionCatalogo;
