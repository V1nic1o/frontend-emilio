import React, { useCallback, useLayoutEffect, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PersonasStackParamList } from '../../navegacion/tipos';
import { useAsesoriaPersona } from '../../hooks/useAsesorias';
import { useWallet } from '../../contexto/WalletContext';
import { asesoriasServicio } from '../../servicios/asesorias.servicio';
import CampoTexto from '../../componentes/CampoTexto';
import BotonPrimario from '../../componentes/BotonPrimario';
import { COLORES } from '../../estilos/colores';
import { FUENTE, ESPACIADO, RADIO, SCROLL_FORM_PADDING_BOTTOM } from '../../estilos/tema';
import { formatearMoneda, formatearFecha } from '../../utilidades/formato';
import { generarYCompartirPdfReciboAsesoria } from '../../utilidades/pdf';
import { mostrarAlerta, confirmarYEntonces } from '../../utilidades/alertaPlataforma';
import { perfilServicio, PerfilEmpresa } from '../../servicios/perfil.servicio';
import { AsesoriaCobro } from '../../tipos';

type Props = NativeStackScreenProps<PersonasStackParamList, 'AsesoriaMensual'>;

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function etiquetaPeriodoAsesoria(anio: number, mes: number) {
  return `${MESES_CORTO[mes - 1] ?? mes} ${anio}`;
}

function textoInfoAsesoriaMensual() {
  return {
    regla:
      'Desde el mes de alta hasta hoy se van creando los cobros mensuales al abrir Inicio o esta pantalla (si faltaba un mes, se completa). Cuando cobres, tocá «Registrar pago».',
    extra:
      'Si no abriste la app un mes, no se pierde: al volver a entrar aparecen los periodos pendientes en el historial.',
  };
}

const REGLA_PLAN_CORTA =
  'Los meses desde el alta hasta hoy se sincronizan al abrir Inicio o acá. Registrá el pago cuando cobres.';

/** IVA en moneda sobre el monto base mensual (mismo criterio que el total del periodo: base × %/100). */
function montoIvaMensualSuscripcion(montoMensual: number, impuestoPct: number | null | undefined): number | null {
  if (impuestoPct == null || impuestoPct <= 0) return null;
  const raw = montoMensual * (impuestoPct / 100);
  return Math.round(raw * 100) / 100;
}

const AsesoriaMensualPantalla: React.FC<Props> = ({ navigation, route }) => {
  const { personaId, personaNombre, personaNit } = route.params;
  const { walletSeleccionado, solicitarRefrescoFinanzas } = useWallet();
  const { data: asesoriaResp, cargar: cargarAsesoria, cargando, error } = useAsesoriaPersona(personaId);

  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [montoStr, setMontoStr] = useState('');
  const [impuestoStr, setImpuestoStr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [perfilEmpresa, setPerfilEmpresa] = useState<PerfilEmpresa | null>(null);
  const [generandoReciboId, setGenerandoReciboId] = useState<number | null>(null);

  const nombreCliente = personaNombre?.trim() || 'Cliente';
  const inicialCliente = nombreCliente.charAt(0).toUpperCase() || 'C';

  useEffect(() => {
    const w = walletSeleccionado;
    const esEmpresa = w != null && (w.tipo === 'empresa' || w.tipo == null);
    if (!esEmpresa || w?.id == null) {
      setPerfilEmpresa(null);
      return;
    }
    perfilServicio.obtener(w.id).then(setPerfilEmpresa).catch(() => setPerfilEmpresa(null));
  }, [walletSeleccionado]);

  useLayoutEffect(() => {
    const titulo = `Asesoría · ${nombreCliente}`;
    navigation.setOptions({
      title: titulo.length > 34 ? `${titulo.slice(0, 32)}…` : titulo,
    });
  }, [navigation, nombreCliente]);

  useFocusEffect(
    useCallback(() => {
      cargarAsesoria();
    }, [cargarAsesoria]),
  );

  const cobrosAsesoria = asesoriaResp?.suscripcion?.cobros ?? [];
  const infoAsesoriaMensual = textoInfoAsesoriaMensual();
  const suscripcionPlan = asesoriaResp?.suscripcion;
  const ivaMensualPlan =
    suscripcionPlan != null
      ? montoIvaMensualSuscripcion(suscripcionPlan.montoMensual, suscripcionPlan.impuestoPct)
      : null;

  const abrirModalCrear = () => {
    setMontoStr('');
    setImpuestoStr('');
    setModalCrear(true);
  };

  const abrirModalEditar = () => {
    const s = asesoriaResp?.suscripcion;
    if (!s) return;
    setMontoStr(String(s.montoMensual));
    setImpuestoStr(s.impuestoPct != null && s.impuestoPct > 0 ? String(s.impuestoPct) : '');
    setModalEditar(true);
  };

  const guardarCrear = async () => {
    if (!walletSeleccionado) return;
    const m = parseFloat(montoStr.replace(',', '.'));
    if (!Number.isFinite(m) || m <= 0) {
      mostrarAlerta('Monto inválido', 'Ingresá un monto mayor a cero');
      return;
    }
    const impRaw = impuestoStr.trim();
    let impuestoPct: number | undefined;
    if (impRaw !== '') {
      const p = parseFloat(impRaw.replace(',', '.'));
      if (!Number.isFinite(p) || p < 0) {
        mostrarAlerta('IVA inválido', 'Dejá vacío si no aplica o un porcentaje válido');
        return;
      }
      if (p > 0) impuestoPct = p;
    }
    setGuardando(true);
    try {
      await asesoriasServicio.crear({
        walletId: walletSeleccionado.id,
        personaId,
        montoMensual: m,
        ...(impuestoPct !== undefined && { impuestoPct }),
      });
      setModalCrear(false);
      solicitarRefrescoFinanzas();
      await cargarAsesoria();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const guardarEditar = async () => {
    const sub = asesoriaResp?.suscripcion;
    if (!walletSeleccionado || !sub) return;
    const m = parseFloat(montoStr.replace(',', '.'));
    if (!Number.isFinite(m) || m <= 0) {
      mostrarAlerta('Monto inválido', 'Ingresá un monto mayor a cero');
      return;
    }
    const impRaw = impuestoStr.trim();
    let impuestoPct: number | null;
    if (impRaw === '') {
      impuestoPct = null;
    } else {
      const p = parseFloat(impRaw.replace(',', '.'));
      if (!Number.isFinite(p) || p < 0) {
        mostrarAlerta('IVA inválido', 'Dejá vacío para quitar IVA o un porcentaje válido');
        return;
      }
      impuestoPct = p <= 0 ? null : p;
    }
    setGuardando(true);
    try {
      await asesoriasServicio.actualizar(sub.id, walletSeleccionado.id, {
        montoMensual: m,
        impuestoPct,
      });
      setModalEditar(false);
      solicitarRefrescoFinanzas();
      await cargarAsesoria();
    } catch (e: unknown) {
      mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const generarReciboPdf = async (c: AsesoriaCobro) => {
    if (c.estado !== 'pagada') return;
    setGenerandoReciboId(c.id);
    try {
      await generarYCompartirPdfReciboAsesoria(c, {
        personaNombre: nombreCliente,
        personaNit,
        perfil: perfilEmpresa,
      });
    } catch (e: unknown) {
      mostrarAlerta('Error al generar PDF', e instanceof Error ? e.message : 'No se pudo generar el recibo');
    } finally {
      setGenerandoReciboId(null);
    }
  };

  const confirmarMarcarPagada = (cobroId: number) => {
    if (!walletSeleccionado) return;
    confirmarYEntonces(
      'Marcar periodo como cobrado',
      '¿Confirmás que el cliente ya pagó este mes? Se sumará a ingresos e IVA en estadísticas.',
      { textoAceptar: 'Marcar pagada' },
      async () => {
        try {
          await asesoriasServicio.marcarPagada(cobroId, walletSeleccionado.id);
          solicitarRefrescoFinanzas();
          await cargarAsesoria();
        } catch (e: unknown) {
          mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo registrar');
        }
      },
    );
  };

  const toggleActiva = () => {
    const sub = asesoriaResp?.suscripcion;
    if (!walletSeleccionado || !sub) return;
    const activar = !sub.activa;
    confirmarYEntonces(
      activar ? 'Reactivar asesoría mensual' : 'Pausar asesoría mensual',
      activar
        ? 'Se volverán a generar los periodos del mes en curso y los siguientes.'
        : 'No se crearán nuevos periodos. Lo ya registrado se conserva.',
      { textoAceptar: 'Confirmar' },
      async () => {
        try {
          if (activar) await asesoriasServicio.activar(sub.id, walletSeleccionado.id);
          else await asesoriasServicio.desactivar(sub.id, walletSeleccionado.id);
          solicitarRefrescoFinanzas();
          await cargarAsesoria();
        } catch (e: unknown) {
          mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
        }
      },
    );
  };

  const confirmarEliminar = () => {
    const sub = asesoriaResp?.suscripcion;
    if (!walletSeleccionado || !sub) return;
    confirmarYEntonces(
      'Eliminar asesoría mensual',
      'Se borrará el plan y todo el historial de periodos de este cliente. No se puede deshacer.',
      { textoAceptar: 'Eliminar', destructivo: true },
      async () => {
        try {
          await asesoriasServicio.eliminar(sub.id, walletSeleccionado.id);
          solicitarRefrescoFinanzas();
          await cargarAsesoria();
          navigation.goBack();
        } catch (e: unknown) {
          mostrarAlerta('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
        }
      },
    );
  };

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['top', 'bottom']}>
        <Text style={estilos.errorTexto}>Seleccioná un workspace para continuar.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargarAsesoria} tintColor={COLORES.primario} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Text style={estilos.errorTexto}>{error}</Text>
        ) : (
          <>
            <View style={estilos.encabezadoCliente}>
              <View style={estilos.encabezadoAvatar}>
                <Text style={estilos.encabezadoAvatarLetra}>{inicialCliente}</Text>
              </View>
              <View style={estilos.encabezadoTextos}>
                <Text style={estilos.encabezadoEtiqueta}>Cliente</Text>
                <Text style={estilos.encabezadoNombre} numberOfLines={2}>
                  {nombreCliente}
                </Text>
              </View>
            </View>

            {!asesoriaResp?.suscripcion ? (
              <View style={estilos.tarjeta}>
                <View style={estilos.tarjetaVaciaIcono}>
                  <Ionicons name="calendar-outline" size={28} color={COLORES.primario} />
                </View>
                <Text style={estilos.tarjetaVaciaTitulo}>Configurá la asesoría mensual</Text>
                <Text style={estilos.tarjetaVaciaSub}>
                  Un monto fijo por mes. Podés sumar IVA opcional. Luego aparecerán los meses para marcar cada cobro.
                </Text>
                <View style={estilos.pasosCaja}>
                  <View style={estilos.pasoFila}>
                    <Text style={estilos.pasoNum}>1</Text>
                    <Text style={estilos.pasoTxt}>Definí cuota mensual e impuesto si aplica</Text>
                  </View>
                  <View style={estilos.pasoFila}>
                    <Text style={estilos.pasoNum}>2</Text>
                    <Text style={estilos.pasoTxt}>Cada mes verás un periodo pendiente de cobro</Text>
                  </View>
                  <View style={estilos.pasoFila}>
                    <Text style={estilos.pasoNum}>3</Text>
                    <Text style={estilos.pasoTxt}>Al cobrar, registrá el pago y listo para estadísticas</Text>
                  </View>
                </View>
                <TouchableOpacity style={estilos.btnCrearPlan} onPress={abrirModalCrear} activeOpacity={0.88}>
                  <Ionicons name="add-circle" size={22} color={COLORES.blanco} />
                  <Text style={estilos.btnCrearPlanTxt}>Empezar</Text>
                </TouchableOpacity>
                <View style={estilos.notaInfo}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORES.textoSecundario} />
                  <Text style={estilos.notaInfoTxt}>{infoAsesoriaMensual.regla}</Text>
                </View>
                <Text style={estilos.notaProxima}>{infoAsesoriaMensual.extra}</Text>
              </View>
            ) : (
              <>
                <Text style={estilos.tituloSeccion}>Cuota y estado</Text>
                <View style={estilos.tarjeta}>
                  <View style={estilos.planHeroMonto}>
                    <Text style={estilos.planHeroEtiqueta}>Total a cobrar cada mes</Text>
                    <Text style={estilos.planHeroValor}>{formatearMoneda(asesoriaResp.suscripcion.montoMensual)}</Text>
                    {ivaMensualPlan != null && suscripcionPlan?.impuestoPct != null ? (
                      <View style={estilos.planIvaBloque}>
                        <Text style={estilos.planIvaLinea}>
                          + IVA {suscripcionPlan.impuestoPct}% ({formatearMoneda(ivaMensualPlan)})
                        </Text>
                        <Text style={estilos.planIvaTotal}>
                          Total con impuesto:{' '}
                          {formatearMoneda(asesoriaResp.suscripcion.montoMensual + ivaMensualPlan)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={estilos.planSinIva}>Sin IVA en la cuota</Text>
                    )}
                  </View>

                  <View
                    style={[
                      estilos.chipEstado,
                      asesoriaResp.suscripcion.activa ? estilos.chipEstadoActiva : estilos.chipEstadoPausa,
                    ]}
                  >
                    <Ionicons
                      name={asesoriaResp.suscripcion.activa ? 'radio-button-on' : 'pause-circle'}
                      size={18}
                      color={asesoriaResp.suscripcion.activa ? COLORES.exito : COLORES.textoSecundario}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          estilos.chipEstadoTitulo,
                          !asesoriaResp.suscripcion.activa && { color: COLORES.textoSecundario },
                        ]}
                      >
                        {asesoriaResp.suscripcion.activa ? 'Plan activo' : 'Plan en pausa'}
                      </Text>
                      <Text style={estilos.chipEstadoSub}>
                        {asesoriaResp.suscripcion.activa
                          ? 'Se siguen generando periodos mes a mes.'
                          : 'No se crearán meses nuevos hasta que reanudes.'}
                      </Text>
                    </View>
                  </View>

                  <View style={estilos.cajaAyudaPlan}>
                    <Ionicons name="bulb-outline" size={20} color={COLORES.primario} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={estilos.cajaAyudaTitulo}>Cómo funciona</Text>
                      <Text style={estilos.cajaAyudaTxt}>{REGLA_PLAN_CORTA}</Text>
                      <Text style={estilos.cajaAyudaProxima}>{infoAsesoriaMensual.extra}</Text>
                    </View>
                  </View>

                  <View style={estilos.accionesLista}>
                    <TouchableOpacity style={estilos.accionFila} onPress={abrirModalEditar} activeOpacity={0.7}>
                      <View style={[estilos.accionIcono, { backgroundColor: COLORES.primarioClaro }]}>
                        <Ionicons name="create-outline" size={20} color={COLORES.primario} />
                      </View>
                      <View style={estilos.accionTextos}>
                        <Text style={estilos.accionTitulo}>Editar monto e IVA</Text>
                        <Text style={estilos.accionSub}>Solo cambia periodos que sigan pendientes</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
                    </TouchableOpacity>
                    <View style={estilos.sepAccion} />
                    <TouchableOpacity style={estilos.accionFila} onPress={toggleActiva} activeOpacity={0.7}>
                      <View style={[estilos.accionIcono, { backgroundColor: COLORES.advertenciaClaro }]}>
                        <Ionicons
                          name={asesoriaResp.suscripcion.activa ? 'pause-outline' : 'play-outline'}
                          size={20}
                          color={COLORES.advertencia}
                        />
                      </View>
                      <View style={estilos.accionTextos}>
                        <Text style={estilos.accionTitulo}>
                          {asesoriaResp.suscripcion.activa ? 'Pausar plan' : 'Reanudar plan'}
                        </Text>
                        <Text style={estilos.accionSub}>
                          {asesoriaResp.suscripcion.activa
                            ? 'Detiene la creación de meses nuevos'
                            : 'Vuelve a generar periodos desde el mes actual'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORES.textoDeshabilitado} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={estilos.eliminarTexto} onPress={confirmarEliminar} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={18} color={COLORES.peligro} />
                    <Text style={estilos.eliminarTextoLabel}>Eliminar plan e historial</Text>
                  </TouchableOpacity>
                </View>

                <Text style={estilos.tituloSeccion}>Historial de meses</Text>
                <Text style={estilos.subtituloSeccion}>
                  Pendiente = aún no cobrado. Pagada = ya registrado; podés sacar el recibo en PDF.
                </Text>

                {cobrosAsesoria.length === 0 ? (
                  <View style={estilos.historialVacio}>
                    <Ionicons name="folder-open-outline" size={36} color={COLORES.textoDeshabilitado} />
                    <Text style={estilos.historialVacioTxt}>Todavía no hay meses en el historial.</Text>
                  </View>
                ) : (
                  cobrosAsesoria.map((c) => (
                    <View
                      key={c.id}
                      style={[
                        estilos.periodoTarjeta,
                        c.estado === 'pendiente' ? estilos.periodoBordePendiente : estilos.periodoBordePagada,
                      ]}
                    >
                      <View style={estilos.periodoFilaSuperior}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={estilos.periodoEtiquetaMes}>Mes facturado</Text>
                          <Text style={estilos.periodoMes}>{etiquetaPeriodoAsesoria(c.anio, c.mes)}</Text>
                        </View>
                        <View style={estilos.periodoColMonto}>
                          <Text style={estilos.periodoMonto}>{formatearMoneda(c.montoTotal)}</Text>
                          {c.montoIva > 0 ? (
                            <Text style={estilos.periodoMontoDet}>Base {formatearMoneda(c.montoBase)} + IVA</Text>
                          ) : (
                            <Text style={estilos.periodoMontoDet}>Total del periodo</Text>
                          )}
                        </View>
                      </View>

                      <View
                        style={[
                          estilos.periodoEstadoPill,
                          c.estado === 'pendiente' ? estilos.pillPendiente : estilos.pillPagada,
                        ]}
                      >
                        <Ionicons
                          name={c.estado === 'pendiente' ? 'time-outline' : 'checkmark-circle'}
                          size={16}
                          color={c.estado === 'pendiente' ? COLORES.advertencia : COLORES.exito}
                        />
                        <Text
                          style={[
                            estilos.periodoEstadoTxt,
                            { color: c.estado === 'pendiente' ? COLORES.advertencia : COLORES.exito },
                          ]}
                        >
                          {c.estado === 'pendiente'
                            ? 'Pendiente de cobro'
                            : `Pagada${c.fechaPago ? ` · ${formatearFecha(c.fechaPago)}` : ''}`}
                        </Text>
                      </View>

                      {c.estado === 'pendiente' && (
                        <TouchableOpacity
                          style={estilos.btnRegistrarPago}
                          onPress={() => confirmarMarcarPagada(c.id)}
                          activeOpacity={0.88}
                        >
                          <Ionicons name="wallet-outline" size={20} color={COLORES.blanco} />
                          <Text style={estilos.btnRegistrarPagoTxt}>Registrar pago de este mes</Text>
                        </TouchableOpacity>
                      )}
                      {c.estado === 'pagada' && (
                        <TouchableOpacity
                          style={estilos.btnRecibo}
                          onPress={() => generarReciboPdf(c)}
                          activeOpacity={0.88}
                          disabled={generandoReciboId === c.id}
                        >
                          {generandoReciboId === c.id ? (
                            <Text style={estilos.btnReciboTxt}>Generando PDF…</Text>
                          ) : (
                            <>
                              <Ionicons name="document-text-outline" size={20} color={COLORES.primario} />
                              <Text style={estilos.btnReciboTxt}>Recibo PDF para el cliente</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalCrear} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalContenido}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: SCROLL_FORM_PADDING_BOTTOM }}
              >
                <View style={estilos.modalHandle} />
                <View style={estilos.modalHeader}>
                  <View style={estilos.modalIconBox}>
                    <Ionicons name="calendar-outline" size={20} color={COLORES.primario} />
                  </View>
                  <View>
                    <Text style={estilos.modalTitulo}>Nueva asesoría mensual</Text>
                    <Text style={estilos.modalSubtitulo}>Para {nombreCliente}</Text>
                  </View>
                </View>
                <CampoTexto
                  etiqueta="Monto mensual"
                  placeholder="Ej: 1500"
                  value={montoStr}
                  onChangeText={setMontoStr}
                  icono="cash-outline"
                  keyboardType="decimal-pad"
                />
                <CampoTexto
                  etiqueta="IVA % (opcional)"
                  placeholder="Vacío = sin IVA"
                  value={impuestoStr}
                  onChangeText={setImpuestoStr}
                  icono="pricetag-outline"
                  keyboardType="decimal-pad"
                />
                <View style={estilos.modalBotones}>
                  <BotonPrimario
                    titulo="Cancelar"
                    onPress={() => setModalCrear(false)}
                    variante="secundario"
                    estilo={{ flex: 1, marginRight: ESPACIADO.sm }}
                  />
                  <BotonPrimario titulo="Guardar" onPress={guardarCrear} cargando={guardando} estilo={{ flex: 1 }} />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={modalEditar} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalContenido}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: SCROLL_FORM_PADDING_BOTTOM }}
              >
                <View style={estilos.modalHandle} />
                <View style={estilos.modalHeader}>
                  <View style={estilos.modalIconBox}>
                    <Ionicons name="create-outline" size={20} color={COLORES.primario} />
                  </View>
                  <View>
                    <Text style={estilos.modalTitulo}>Editar cuota</Text>
                    <Text style={estilos.modalSubtitulo}>Periodos pendientes se actualizan</Text>
                  </View>
                </View>
                <CampoTexto
                  etiqueta="Monto mensual"
                  placeholder="Ej: 1500"
                  value={montoStr}
                  onChangeText={setMontoStr}
                  icono="cash-outline"
                  keyboardType="decimal-pad"
                />
                <CampoTexto
                  etiqueta="IVA % (vacío = sin IVA)"
                  placeholder="Vacío = sin IVA"
                  value={impuestoStr}
                  onChangeText={setImpuestoStr}
                  icono="pricetag-outline"
                  keyboardType="decimal-pad"
                />
                <View style={estilos.modalBotones}>
                  <BotonPrimario
                    titulo="Cancelar"
                    onPress={() => setModalEditar(false)}
                    variante="secundario"
                    estilo={{ flex: 1, marginRight: ESPACIADO.sm }}
                  />
                  <BotonPrimario titulo="Guardar" onPress={guardarEditar} cargando={guardando} estilo={{ flex: 1 }} />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xxl },
  errorTexto: { padding: ESPACIADO.md, color: COLORES.peligro, fontSize: FUENTE.tamanoBase },

  encabezadoCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
    paddingVertical: ESPACIADO.sm,
  },
  encabezadoAvatar: {
    width: 52,
    height: 52,
    borderRadius: RADIO.lg,
    backgroundColor: COLORES.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.borde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  encabezadoAvatarLetra: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.primario,
  },
  encabezadoTextos: { flex: 1, minWidth: 0 },
  encabezadoEtiqueta: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  encabezadoNombre: {
    fontSize: FUENTE.tamanoXl,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -0.3,
    lineHeight: 28,
  },

  tituloSeccion: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: ESPACIADO.xs,
    marginTop: ESPACIADO.xs,
  },
  subtituloSeccion: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    lineHeight: 20,
    marginBottom: ESPACIADO.md,
  },

  tarjeta: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.lg,
    marginBottom: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  tarjetaVaciaIcono: {
    width: 56,
    height: 56,
    borderRadius: RADIO.lg,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: ESPACIADO.md,
  },
  tarjetaVaciaTitulo: {
    fontSize: FUENTE.tamanoGrande,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    textAlign: 'center',
    marginBottom: ESPACIADO.sm,
  },
  tarjetaVaciaSub: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.xs,
  },
  pasosCaja: {
    backgroundColor: COLORES.grisClaro,
    borderRadius: RADIO.lg,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.lg,
    gap: ESPACIADO.sm,
  },
  pasoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACIADO.sm },
  pasoNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORES.primario,
    color: COLORES.blanco,
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoBold,
    textAlign: 'center',
    lineHeight: 24,
  },
  pasoTxt: { flex: 1, fontSize: FUENTE.tamanoPequeno, color: COLORES.texto, lineHeight: 20 },
  btnCrearPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primario,
    paddingVertical: ESPACIADO.md,
    borderRadius: RADIO.lg,
  },
  btnCrearPlanTxt: { color: COLORES.blanco, fontWeight: FUENTE.pesoBold, fontSize: FUENTE.tamanoBase },
  notaInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACIADO.sm,
    marginTop: ESPACIADO.lg,
    paddingTop: ESPACIADO.md,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  notaInfoTxt: { flex: 1, fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, lineHeight: 18 },
  notaProxima: {
    marginTop: ESPACIADO.sm,
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.primario,
    textAlign: 'center',
  },

  planHeroMonto: {
    alignItems: 'center',
    paddingBottom: ESPACIADO.lg,
    marginBottom: ESPACIADO.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  planHeroEtiqueta: {
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    marginBottom: ESPACIADO.xs,
  },
  planHeroValor: {
    fontSize: 34,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.texto,
    letterSpacing: -1,
  },
  planIvaBloque: { marginTop: ESPACIADO.sm, alignItems: 'center' },
  planIvaLinea: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },
  planIvaTotal: {
    marginTop: 4,
    fontSize: FUENTE.tamanoBase,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.texto,
  },
  planSinIva: { marginTop: ESPACIADO.sm, fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario },

  chipEstado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACIADO.sm,
    padding: ESPACIADO.md,
    borderRadius: RADIO.lg,
    marginBottom: ESPACIADO.md,
  },
  chipEstadoActiva: { backgroundColor: COLORES.exitoClaro },
  chipEstadoPausa: { backgroundColor: COLORES.grisClaro },
  chipEstadoTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoBold, color: COLORES.exito },
  chipEstadoSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2, lineHeight: 17 },

  cajaAyudaPlan: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.primarioClaro,
    padding: ESPACIADO.md,
    borderRadius: RADIO.lg,
    marginBottom: ESPACIADO.lg,
  },
  cajaAyudaTitulo: {
    fontSize: FUENTE.tamanoPequeno,
    fontWeight: FUENTE.pesoBold,
    color: COLORES.primario,
    marginBottom: 4,
  },
  cajaAyudaTxt: { fontSize: FUENTE.tamanoXs, color: COLORES.texto, lineHeight: 18 },
  cajaAyudaProxima: {
    marginTop: ESPACIADO.sm,
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.primarioOscuro,
  },

  accionesLista: {
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: COLORES.borde,
    overflow: 'hidden',
    marginBottom: ESPACIADO.md,
  },
  accionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ESPACIADO.md,
    paddingHorizontal: ESPACIADO.sm,
    backgroundColor: COLORES.tarjeta,
    gap: ESPACIADO.sm,
  },
  accionIcono: {
    width: 40,
    height: 40,
    borderRadius: RADIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionTextos: { flex: 1, minWidth: 0 },
  accionTitulo: { fontSize: FUENTE.tamanoBase, fontWeight: FUENTE.pesoSemibold, color: COLORES.texto },
  accionSub: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2 },
  sepAccion: { height: 1, backgroundColor: COLORES.borde, marginLeft: 56 },

  eliminarTexto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.sm,
  },
  eliminarTextoLabel: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold, color: COLORES.peligro },

  historialVacio: {
    alignItems: 'center',
    paddingVertical: ESPACIADO.xl,
    paddingHorizontal: ESPACIADO.md,
  },
  historialVacioTxt: {
    marginTop: ESPACIADO.sm,
    fontSize: FUENTE.tamanoPequeno,
    color: COLORES.textoSecundario,
    textAlign: 'center',
  },

  periodoTarjeta: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: RADIO.xl,
    padding: ESPACIADO.md,
    marginBottom: ESPACIADO.md,
    borderWidth: 1,
    borderColor: COLORES.borde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  periodoBordePendiente: {
    borderLeftWidth: 4,
    borderLeftColor: COLORES.advertencia,
  },
  periodoBordePagada: {
    borderLeftWidth: 4,
    borderLeftColor: COLORES.exito,
  },
  periodoFilaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ESPACIADO.sm,
  },
  periodoEtiquetaMes: {
    fontSize: FUENTE.tamanoXs,
    fontWeight: FUENTE.pesoSemibold,
    color: COLORES.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  periodoMes: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  periodoColMonto: { alignItems: 'flex-end', maxWidth: '48%' },
  periodoMonto: { fontSize: FUENTE.tamanoMedio, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  periodoMontoDet: { fontSize: FUENTE.tamanoXs, color: COLORES.textoSecundario, marginTop: 2, textAlign: 'right' },

  periodoEstadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: ESPACIADO.sm,
    paddingVertical: 6,
    borderRadius: RADIO.full,
    marginBottom: ESPACIADO.sm,
  },
  pillPendiente: { backgroundColor: COLORES.advertenciaClaro },
  pillPagada: { backgroundColor: COLORES.exitoClaro },
  periodoEstadoTxt: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoSemibold },

  btnRegistrarPago: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    backgroundColor: COLORES.exito,
    paddingVertical: ESPACIADO.md,
    borderRadius: RADIO.lg,
  },
  btnRegistrarPagoTxt: { color: COLORES.blanco, fontWeight: FUENTE.pesoBold, fontSize: FUENTE.tamanoBase },

  btnRecibo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACIADO.sm,
    paddingVertical: ESPACIADO.md,
    borderRadius: RADIO.lg,
    borderWidth: 1.5,
    borderColor: COLORES.primario,
    backgroundColor: COLORES.primarioClaro,
  },
  btnReciboTxt: { fontSize: FUENTE.tamanoPequeno, fontWeight: FUENTE.pesoBold, color: COLORES.primario },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContenido: {
    backgroundColor: COLORES.fondo,
    borderTopLeftRadius: RADIO.xl,
    borderTopRightRadius: RADIO.xl,
    padding: ESPACIADO.md,
    paddingBottom: ESPACIADO.xl,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORES.bordeOscuro,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: ESPACIADO.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.md, marginBottom: ESPACIADO.lg },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIO.md,
    backgroundColor: COLORES.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitulo: { fontSize: FUENTE.tamanoGrande, fontWeight: FUENTE.pesoBold, color: COLORES.texto },
  modalSubtitulo: { fontSize: FUENTE.tamanoPequeno, color: COLORES.textoSecundario, marginTop: 2 },
  modalBotones: { flexDirection: 'row', marginTop: ESPACIADO.md },
});

export default AsesoriaMensualPantalla;
