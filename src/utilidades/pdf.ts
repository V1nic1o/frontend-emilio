import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Pedido } from '../tipos';
import { formatearFecha, formatearMoneda } from './formato';

const generarFilasItems = (pedido: Pedido): string => {
  const esCliente = pedido.persona?.tipo === 'cliente';
  const items = pedido.items ?? [];

  return items
    .map((item) => {
      const precio = esCliente ? item.precioVenta : item.precioCompra;
      const subtotal = item.cantidad * precio;
      return `
        <tr>
          <td>${item.nombre}</td>
          <td style="text-align:center;">${item.tipo === 'bien' ? 'Bien' : 'Servicio'}</td>
          <td style="text-align:center;">${item.cantidad}</td>
          <td style="text-align:right;">${formatearMoneda(precio)}</td>
          <td style="text-align:right;">${formatearMoneda(subtotal)}</td>
        </tr>`;
    })
    .join('');
};

const generarFilasPagos = (pedido: Pedido): string => {
  const pagos = pedido.pagos ?? [];
  if (pagos.length === 0) return '<p style="color:#64748B;">Sin pagos registrados.</p>';

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="padding:8px;text-align:left;">Fecha</th>
          <th style="padding:8px;text-align:right;">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${pagos
          .map(
            (p) => `
          <tr>
            <td style="padding:8px;">${formatearFecha(p.fecha)}</td>
            <td style="padding:8px;text-align:right;">${formatearMoneda(p.monto)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
};

export const generarHTML = (pedido: Pedido): string => {
  const esCliente = pedido.persona?.tipo === 'cliente';
  const resumen = pedido.resumen;
  const total = esCliente ? resumen?.totalVenta ?? 0 : resumen?.totalCompra ?? 0;
  const totalPagado = resumen?.totalPagado ?? 0;
  const saldo = Math.max(0, total - totalPagado);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #1E293B; margin: 32px; }
    h1 { color: #2563EB; margin-bottom: 4px; }
    h2 { color: #1E293B; font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    .badge { display:inline-block; padding:4px 10px; border-radius:99px; font-size:12px; font-weight:600; }
    .cliente { background:#EFF6FF; color:#2563EB; }
    .proveedor { background:#EDE9FE; color:#7C3AED; }
    .pendiente { background:#FEF3C7; color:#D97706; }
    .parcial { background:#EFF6FF; color:#2563EB; }
    .pagado { background:#DCFCE7; color:#16A34A; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:10px; border-bottom:1px solid #E2E8F0; font-size:14px; }
    th { background:#F8FAFC; text-align:left; }
    .total-row td { font-weight:700; background:#F8FAFC; }
    .saldo-row td { font-weight:700; color:${saldo > 0 ? '#DC2626' : '#16A34A'}; }
    .meta { color:#64748B; font-size:13px; margin:4px 0; }
  </style>
</head>
<body>
  <h1>Pedido #${pedido.id}</h1>
  <p class="meta">Fecha: ${formatearFecha(pedido.fecha)}</p>
  <p class="meta">
    Persona: <strong>${pedido.persona?.nombre ?? '-'}</strong>
    <span class="badge ${pedido.persona?.tipo ?? ''}" style="margin-left:8px;">
      ${esCliente ? 'Cliente' : 'Proveedor'}
    </span>
  </p>
  <p class="meta">
    Tipo: <strong>${pedido.tipo === 'venta' ? 'Venta' : 'Compra'}</strong>
    &nbsp;
    Estado: <span class="badge ${pedido.resumen?.estado ?? 'pendiente'}">
      ${pedido.resumen?.estado === 'pagado' ? 'Pagado' : pedido.resumen?.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
    </span>
  </p>

  <h2>Items</h2>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th style="text-align:center;">Tipo</th>
        <th style="text-align:center;">Cant.</th>
        <th style="text-align:right;">Precio Unit.</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${generarFilasItems(pedido)}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" style="text-align:right;">Total</td>
        <td style="text-align:right;">${formatearMoneda(total)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align:right;color:#64748B;">Total Pagado</td>
        <td style="text-align:right;color:#64748B;">${formatearMoneda(totalPagado)}</td>
      </tr>
      <tr class="saldo-row">
        <td colspan="4" style="text-align:right;">Saldo Pendiente</td>
        <td style="text-align:right;">${formatearMoneda(saldo)}</td>
      </tr>
    </tfoot>
  </table>

  <h2>Pagos</h2>
  ${generarFilasPagos(pedido)}

  <p style="margin-top:40px;color:#94A3B8;font-size:11px;text-align:center;">
    Generado el ${new Date().toLocaleDateString('es-AR')}
  </p>
</body>
</html>`;
};

export const generarYCompartirPDF = async (pedido: Pedido): Promise<void> => {
  if (!pedido.persona) {
    throw new Error('El pedido no tiene persona asociada. No se puede generar el PDF.');
  }
  const html = generarHTML(pedido);
  const { uri } = await Print.printToFileAsync({ html });
  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Pedido #${pedido.id}`,
    });
  } else {
    await Print.printAsync({ uri });
  }
};
