import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../navegacion/tipos';
import { estadisticasServicio } from '../servicios/estadisticas.servicio';
import { COLORES } from '../estilos/colores';
import { FUENTE, ESPACIADO, RADIO } from '../estilos/tema';
import { formatearMoneda, formatearFecha } from '../utilidades/formato';
import type { DesgloseMes as DesgloseMesDto } from '../tipos';

type TabNav = BottomTabNavigationProp<TabParamList>;

export type DesgloseMesContenidoProps = {
  walletId: number;
  anio: number;
  /** 1–12 */
  mes: number;
  /** Cambia cuando conviene forzar recarga (p. ej. epoch de finanzas o rango de fechas). */
  syncKey?: string | number;
  /** Texto introductorio bajo los totales (por defecto el del desglose mensual). */
  mostrarIntro?: boolean;
  /** Notifica inicio/fin de la petición (útil para `RefreshControl` en el padre). */
  onLoadingChange?: (cargando: boolean) => void;
};

export function DesgloseMesContenido({
  walletId,
  anio,
  mes,
  syncKey = '',
  mostrarIntro = true,
  onLoadingChange,
}: DesgloseMesContenidoProps) {
  const tabNavigation = useNavigation<TabNav>();
  const [data, setData] = useState<DesgloseMesDto | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onLoadingRef = useRef(onLoadingChange);
  onLoadingRef.current = onLoadingChange;

  const cargar = useCallback(async () => {
    onLoadingRef.current?.(true);
    setCargando(true);
    setError(null);
    try {
      const d = await estadisticasServicio.obtenerDesgloseMes(walletId, anio, mes);
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el desglose');
      setData(null);
    } finally {
      setCargando(false);
      onLoadingRef.current?.(false);
    }
  }, [walletId, anio, mes]);

  useEffect(() => {
    void cargar();
  }, [cargar, syncKey]);

  const irPedido = useCallback(
    (pedidoId: number) => {
      tabNavigation.navigate('PedidosTab', { screen: 'DetallePedido', params: { pedidoId } });
    },
    [tabNavigation],
  );

  const vacio =
    data &&
    data.pedidos.length === 0 &&
    data.asesorias.length === 0 &&
    data.gastos.length === 0 &&
    Math.abs(data.totales.ingresos) < 0.005 &&
    Math.abs(data.totales.gastos) < 0.005;

  if (cargando && !data) {
    return (
      <View style={estilos.cargandoBox}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  if (error) {
    return <Text style={estilos.errorTxt}>{error}</Text>;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {mostrarIntro ? (
        <Text style={estilos.subtitulo}>
          Cobros y gastos con fecha en este mes (zona de estadísticas del negocio), mismo criterio que el resumen
          mensual.
        </Text>
      ) : null}

      <View style={estilos.resumenCard}>
        <FilaResumen k="Ingresos (caja)" v={data.totales.ingresos} pos />
        <FilaResumen k="Costo de ventas" v={data.totales.costoVentas} prefijo="−" />
        <FilaResumen k="IVA" v={data.totales.impuestosIva} neutro />
        <FilaResumen k="Gastos" v={data.totales.gastos} prefijo="−" />
        <View style={estilos.sep} />
        <View style={estilos.filaResumen}>
          <Text style={estilos.resumenKStrong}>Ganancia neta</Text>
          <Text
            style={[
              estilos.resumenVStrong,
              { color: data.totales.gananciaNeta >= 0 ? COLORES.pagado : COLORES.pendiente },
            ]}
          >
            {data.totales.gananciaNeta >= 0 ? '' : '−'}
            {formatearMoneda(Math.abs(data.totales.gananciaNeta))}
          </Text>
        </View>
      </View>

      {cargando ? (
        <View style={estilos.cargandoInline}>
          <ActivityIndicator size="small" color={COLORES.primario} />
        </View>
      ) : null}

      {vacio ? (
        <View style={estilos.aviso}>
          <Ionicons name="file-tray-outline" size={22} color={COLORES.textoSecundario} />
          <Text style={estilos.avisoTxt}>No hay movimientos reconocidos en este mes.</Text>
        </View>
      ) : null}

      <Seccion titulo="Pedidos (ventas y compras)" icon="cart-outline">
        {data.pedidos.length === 0 ? (
          <Text style={estilos.sinItems}>Ninguna línea de pedido en el mes.</Text>
        ) : (
          data.pedidos.map((l, idx) => (
            <TouchableOpacity
              key={`${l.tipo}-${l.pedidoId}`}
              style={[estilos.linea, idx === 0 && estilos.lineaPrimera]}
              onPress={() => irPedido(l.pedidoId)}
              activeOpacity={0.88}
            >
              <View style={estilos.lineaTxtWrap}>
                <Text style={estilos.lineaEtq}>{l.etiqueta}</Text>
                <Text style={estilos.lineaTipo}>
                  {l.tipo === 'venta' ? 'Venta' : 'Compra'} · IVA {formatearMoneda(l.iva)}
                </Text>
              </View>
              <View style={estilos.lineaMontos}>
                {l.ingreso > 0.005 ? <Text style={estilos.lineaIng}>+{formatearMoneda(l.ingreso)}</Text> : null}
                {l.costo > 0.005 ? <Text style={estilos.lineaCosto}>−{formatearMoneda(l.costo)} costo</Text> : null}
                <Ionicons name="chevron-forward" size={16} color={COLORES.textoSecundario} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </Seccion>

      <Seccion titulo="Asesorías cobradas" icon="people-outline">
        {data.asesorias.length === 0 ? (
          <Text style={estilos.sinItems}>Sin cobros de asesoría en el mes.</Text>
        ) : (
          data.asesorias.map((a, idx) => (
            <View key={a.cobroId} style={[estilos.lineaEstatica, idx === 0 && estilos.lineaPrimera]}>
              <View style={estilos.lineaTxtWrap}>
                <Text style={estilos.lineaEtq}>{a.personaNombre}</Text>
                <Text style={estilos.lineaTipo}>
                  Periodo {a.mes}/{a.anio} · Pago {formatearFecha(a.fechaPago.slice(0, 10))}
                </Text>
              </View>
              <Text style={estilos.lineaIng}>{formatearMoneda(a.montoTotal)}</Text>
            </View>
          ))
        )}
      </Seccion>

      <Seccion titulo="Gastos" icon="receipt-outline">
        {data.gastos.length === 0 ? (
          <Text style={estilos.sinItems}>Sin gastos con fecha en el mes.</Text>
        ) : (
          data.gastos.map((g, idx) => (
            <View key={g.gastoId} style={[estilos.lineaEstatica, idx === 0 && estilos.lineaPrimera]}>
              <View style={estilos.lineaTxtWrap}>
                <Text style={estilos.lineaEtq}>{g.descripcion}</Text>
                <Text style={estilos.lineaTipo}>
                  {g.categoria ? `${g.categoria} · ` : ''}
                  {formatearFecha(g.fecha.slice(0, 10))}
                </Text>
              </View>
              <Text style={estilos.lineaCosto}>{formatearMoneda(g.monto)}</Text>
            </View>
          ))
        )}
      </Seccion>
    </>
  );
}

function Seccion({
  titulo,
  icon,
  children,
}: {
  titulo: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.seccion}>
      <View style={estilos.seccionHead}>
        <Ionicons name={icon} size={18} color={COLORES.primario} />
        <Text style={estilos.seccionTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function FilaResumen({
  k,
  v,
  prefijo,
  pos,
  neutro,
}: {
  k: string;
  v: number;
  prefijo?: string;
  pos?: boolean;
  neutro?: boolean;
}) {
  const color = neutro ? COLORES.morado : pos ? COLORES.pagado : COLORES.texto;
  return (
    <View style={estilos.filaResumen}>
      <Text style={estilos.resumenK}>{k}</Text>
      <Text style={[estilos.resumenV, { color }]}>
        {prefijo && v > 0.005 ? prefijo : ''}
        {formatearMoneda(v)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cargandoBox: { paddingVertical: ESPACIADO.lg, alignItems: 'center' },
  cargandoInline: { paddingVertical: ESPACIADO.sm, alignItems: 'center' },
  errorTxt: { color: COLORES.peligro, fontSize: FUENTE.tamanoBase, paddingVertical: ESPACIADO.sm },
  subtitulo: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    lineHeight: 20,
    marginBottom: ESPACIADO.md,
  },
  resumenCard: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
  },
  filaResumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resumenK: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, flex: 1 },
  resumenKStrong: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  resumenV: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold },
  resumenVStrong: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold },
  sep: { height: 1, backgroundColor: COLORES.borde, marginVertical: ESPACIADO.sm },
  aviso: {
    flexDirection: 'row',
    gap: ESPACIADO.sm,
    alignItems: 'center',
    padding: ESPACIADO.md,
    backgroundColor: COLORES.grisClaro,
    borderRadius: RADIO.lg,
    marginBottom: ESPACIADO.md,
  },
  avisoTxt: { flex: 1, fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },
  seccion: {
    marginBottom: ESPACIADO.md,
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: ESPACIADO.md,
  },
  seccionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: ESPACIADO.sm },
  seccionTitulo: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  sinItems: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, fontStyle: 'italic' },
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  lineaPrimera: { borderTopWidth: 0 },
  lineaEstatica: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  lineaTxtWrap: { flex: 1, minWidth: 0 },
  lineaEtq: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  lineaTipo: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  lineaMontos: { alignItems: 'flex-end', gap: 2 },
  lineaIng: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.pagado },
  lineaCosto: { fontSize: FUENTE.tamanoXs, color: COLORES.pendiente, fontWeight: FUENTE.pesoSemibold },
});
