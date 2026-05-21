import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { InicioStackParamList } from '../../navegacion/tipos';
import { useWallet } from '../../contexto/WalletContext';
import { COLORES } from '../../estilos/colores';
import { ESPACIADO, FUENTE } from '../../estilos/tema';
import { DesgloseMesContenido } from '../../componentes/DesgloseMesContenido';

const MESES_ETQ = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

type Props = NativeStackScreenProps<InicioStackParamList, 'DesgloseMes'>;

const DesgloseMesPantalla: React.FC<Props> = ({ navigation: stackNavigation }) => {
  const route = useRoute<RouteProp<InicioStackParamList, 'DesgloseMes'>>();
  const { anio, mes } = route.params;
  const { walletSeleccionado, finanzasEpoch } = useWallet();
  const [refreshTick, setRefreshTick] = useState(0);
  const [refrescandoPull, setRefrescandoPull] = useState(false);
  const pullActivoRef = useRef(false);
  const omitirPrimerFocusRef = useRef(true);

  const tituloCabecera = useMemo(() => {
    const etq = MESES_ETQ[mes - 1] ?? String(mes);
    return `${etq} ${anio}`;
  }, [anio, mes]);

  useLayoutEffect(() => {
    stackNavigation.setOptions({ title: tituloCabecera });
  }, [stackNavigation, tituloCabecera]);

  const onRefresh = useCallback(() => {
    pullActivoRef.current = true;
    setRefrescandoPull(true);
    setRefreshTick((t) => t + 1);
  }, []);

  const onLoadingChange = useCallback((cargando: boolean) => {
    if (!cargando && pullActivoRef.current) {
      pullActivoRef.current = false;
      setRefrescandoPull(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (omitirPrimerFocusRef.current) {
        omitirPrimerFocusRef.current = false;
        return;
      }
      setRefreshTick((t) => t + 1);
    }, []),
  );

  const syncKey = `${finanzasEpoch}-${refreshTick}`;

  if (!walletSeleccionado) {
    return (
      <SafeAreaView style={estilos.safe} edges={['bottom']}>
        <Text style={estilos.errorWallet}>Seleccioná un workspace.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl refreshing={refrescandoPull} onRefresh={onRefresh} tintColor={COLORES.primario} />
        }
        showsVerticalScrollIndicator={false}
      >
        <DesgloseMesContenido
          walletId={walletSeleccionado.id}
          anio={anio}
          mes={mes}
          syncKey={syncKey}
          mostrarIntro
          onLoadingChange={onLoadingChange}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORES.fondo },
  scroll: { padding: ESPACIADO.md, paddingBottom: ESPACIADO.xl },
  errorWallet: { color: COLORES.peligro, fontSize: FUENTE.tamanoBase, padding: ESPACIADO.md },
});

export default DesgloseMesPantalla;
