import type { Gasto, IngresoPersonal } from '../tipos';

export const MESES_CORTO_RESUMEN = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

/**
 * Año y mes calendario para agrupar movimientos personales.
 * `new Date('YYYY-MM-DD')` usa UTC medianoche y en zonas UTC− puede cambiar el mes local;
 * las fechas solo-día del backend deben interpretarse como calendario local.
 */
export function anioMesCalendarioDesdeFecha(fecha: string): { anio: number; mesIndex: number } {
  const s = fecha.trim();
  const solo = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (solo) {
    const anio = parseInt(solo[1], 10);
    const mesIndex = parseInt(solo[2], 10) - 1;
    const dia = parseInt(solo[3], 10);
    if (Number.isFinite(anio) && mesIndex >= 0 && mesIndex <= 11 && dia >= 1 && dia <= 31) {
      return { anio, mesIndex };
    }
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { anio: 1970, mesIndex: 0 };
  return { anio: d.getFullYear(), mesIndex: d.getMonth() };
}

export type MesPersonalResumen = {
  mes: string;
  anio: number;
  ingresos: number;
  gastos: number;
  balance: number;
};

/** Últimos `cantMeses` meses calendario con sumas de ingresos y gastos personales. */
export function construirUltimosMesesPersonal(
  ingresos: IngresoPersonal[],
  gastos: Gasto[],
  cantMeses: number,
): MesPersonalResumen[] {
  const hoy = new Date();
  const out: MesPersonalResumen[] = [];
  const n = Math.max(1, Math.min(24, cantMeses));

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const ys = d.getFullYear();
    const ms = d.getMonth();
    let ing = 0;
    let gas = 0;
    for (const ingr of ingresos) {
      const { anio: yi, mesIndex: mi } = anioMesCalendarioDesdeFecha(ingr.fecha);
      if (yi === ys && mi === ms) ing += ingr.monto;
    }
    for (const g of gastos) {
      const { anio: yg, mesIndex: mg } = anioMesCalendarioDesdeFecha(g.fecha);
      if (yg === ys && mg === ms) gas += g.monto;
    }
    ing = Math.round(ing * 100) / 100;
    gas = Math.round(gas * 100) / 100;
    out.push({
      mes: MESES_CORTO_RESUMEN[ms] ?? '',
      anio: ys,
      ingresos: ing,
      gastos: gas,
      balance: Math.round((ing - gas) * 100) / 100,
    });
  }
  return out;
}

/** Totales del año calendario actual a partir de movimientos (personal). */
export function totalesAnioCalendarioPersonal(
  ingresos: IngresoPersonal[],
  gastos: Gasto[],
  anio: number,
): { ingresos: number; gastos: number; balance: number } {
  let ing = 0;
  let gas = 0;
  for (const ingr of ingresos) {
    const { anio: y } = anioMesCalendarioDesdeFecha(ingr.fecha);
    if (y === anio) ing += ingr.monto;
  }
  for (const g of gastos) {
    const { anio: y } = anioMesCalendarioDesdeFecha(g.fecha);
    if (y === anio) gas += g.monto;
  }
  ing = Math.round(ing * 100) / 100;
  gas = Math.round(gas * 100) / 100;
  return { ingresos: ing, gastos: gas, balance: Math.round((ing - gas) * 100) / 100 };
}

/** Totales agregados de un rango de meses personales. */
export function totalesPeriodoPersonal(meses: MesPersonalResumen[]): {
  ingresos: number;
  gastos: number;
  balance: number;
  promedioMensualBalance: number;
  mesesEnPeriodo: number;
} {
  let ing = 0;
  let gas = 0;
  const n = meses.length;
  for (const m of meses) {
    ing += m.ingresos;
    gas += m.gastos;
  }
  ing = Math.round(ing * 100) / 100;
  gas = Math.round(gas * 100) / 100;
  const balance = Math.round((ing - gas) * 100) / 100;
  const promedioMensualBalance = n > 0 ? Math.round((balance / n) * 100) / 100 : 0;
  return { ingresos: ing, gastos: gas, balance, promedioMensualBalance, mesesEnPeriodo: n };
}

/** Meses calendario entre el primer día de `desdeMes` y el de `hastaMes` (inclusive), máx. 36. */
export function construirMesesPersonalEnRango(
  ingresos: IngresoPersonal[],
  gastos: Gasto[],
  desdeMes: Date,
  hastaMes: Date,
): MesPersonalResumen[] {
  const inicio = new Date(desdeMes.getFullYear(), desdeMes.getMonth(), 1);
  const fin = new Date(hastaMes.getFullYear(), hastaMes.getMonth(), 1);
  if (inicio > fin) return [];

  const out: MesPersonalResumen[] = [];
  let y = inicio.getFullYear();
  let m = inicio.getMonth();
  const endY = fin.getFullYear();
  const endM = fin.getMonth();
  let count = 0;
  while ((y < endY || (y === endY && m <= endM)) && count < 36) {
    let ing = 0;
    let gas = 0;
    for (const ingr of ingresos) {
      const { anio: yi, mesIndex: mi } = anioMesCalendarioDesdeFecha(ingr.fecha);
      if (yi === y && mi === m) ing += ingr.monto;
    }
    for (const g of gastos) {
      const { anio: yg, mesIndex: mg } = anioMesCalendarioDesdeFecha(g.fecha);
      if (yg === y && mg === m) gas += g.monto;
    }
    ing = Math.round(ing * 100) / 100;
    gas = Math.round(gas * 100) / 100;
    out.push({
      mes: MESES_CORTO_RESUMEN[m] ?? '',
      anio: y,
      ingresos: ing,
      gastos: gas,
      balance: Math.round((ing - gas) * 100) / 100,
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    count += 1;
  }
  return out;
}
