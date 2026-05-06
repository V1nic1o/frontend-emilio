import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { AsesoriaCobro, Pedido } from '../tipos';
import { PerfilEmpresa } from '../servicios/perfil.servicio';
import { formatearFecha, formatearMoneda } from './formato';

export type TipoPDF = 'cliente' | 'proveedor' | 'completo' | 'cotizacion';

/** Logos data-URL muy grandes hacen que expo-print se cuelgue o tarde minutos. */
const MAX_LOGO_BASE64_CHARS = 200_000;

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * En web, `Print.printToFileAsync({ html })` no genera PDF desde HTML: solo llama a `window.print()`
 * sobre la app visible (captura de pantalla). Aquí imprimimos el HTML en un iframe oculto.
 */
async function imprimirHtmlEnWeb(html: string): Promise<void> {
  if (typeof document === 'undefined') {
    throw new Error('La generación de PDF desde HTML no está disponible en este entorno.');
  }

  await new Promise<void>((resolve, reject) => {
    let iframe: HTMLIFrameElement | null = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.style.top = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      document.body.removeChild(iframe);
      reject(new Error('No se pudo preparar la ventana de impresión.'));
      return;
    }

    const ventanaImpr = win;

    let uiListo = false;
    const desbloquearUi = () => {
      if (uiListo) return;
      uiListo = true;
      resolve();
    };

    let limpiado = false;
    let fallbackMs: ReturnType<typeof setTimeout> | undefined;
    let unblockMs: ReturnType<typeof setTimeout> | undefined;

    const quitarIframe = () => {
      if (iframe?.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = null;
    };

    function onAfterPrint() {
      if (limpiado) return;
      limpiado = true;
      try {
        ventanaImpr.removeEventListener('afterprint', onAfterPrint);
      } catch {
        /* — */
      }
      try {
        window.removeEventListener('afterprint', onAfterPrint);
      } catch {
        /* — */
      }
      if (fallbackMs !== undefined) clearTimeout(fallbackMs);
      if (unblockMs !== undefined) clearTimeout(unblockMs);
      quitarIframe();
      if (!uiListo) desbloquearUi();
    }

    try {
      doc.open();
      doc.write(html);
      doc.close();
    } catch (e) {
      try {
        ventanaImpr.removeEventListener('afterprint', onAfterPrint);
      } catch {
        /* — */
      }
      try {
        window.removeEventListener('afterprint', onAfterPrint);
      } catch {
        /* — */
      }
      quitarIframe();
      reject(e instanceof Error ? e : new Error('No se pudo escribir el documento para imprimir.'));
      return;
    }

    try {
      ventanaImpr.addEventListener('afterprint', onAfterPrint);
    } catch {
      /* — */
    }
    try {
      window.addEventListener('afterprint', onAfterPrint);
    } catch {
      /* — */
    }

    fallbackMs = setTimeout(onAfterPrint, 90_000);

    const disparar = () => {
      try {
        ventanaImpr.focus();
        ventanaImpr.print();
      } catch (e) {
        try {
          ventanaImpr.removeEventListener('afterprint', onAfterPrint);
        } catch {
          /* — */
        }
        try {
          window.removeEventListener('afterprint', onAfterPrint);
        } catch {
          /* — */
        }
        if (fallbackMs !== undefined) clearTimeout(fallbackMs);
        if (unblockMs !== undefined) clearTimeout(unblockMs);
        quitarIframe();
        reject(e instanceof Error ? e : new Error('No se pudo abrir el diálogo de impresión.'));
        return;
      }
      // `afterprint` no siempre se dispara (p. ej. al cancelar); no dejar el botón «PDF» cargando.
      unblockMs = setTimeout(() => desbloquearUi(), 600);
    };

    setTimeout(disparar, 150);
  });
}

// ─── Estilos base compartidos ─────────────────────────────────────────────────

const CSS_BASE = `
  body { font-family: Arial, sans-serif; color: #1E293B; margin: 32px; }
  h1 { margin-bottom: 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:700; }
  .cliente { background:#EFF6FF; color:#2563EB; }
  .proveedor { background:#EDE9FE; color:#7C3AED; }
  .pendiente { background:#FEF3C7; color:#D97706; }
  .parcial { background:#EFF6FF; color:#2563EB; }
  .pagado { background:#DCFCE7; color:#16A34A; }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:9px; border-bottom:1px solid #E2E8F0; font-size:13px; }
  th { background:#F8FAFC; text-align:left; }
  .right { text-align:right; }
  .center { text-align:center; }
  .total-row td { font-weight:700; background:#F8FAFC; }
  .meta { color:#64748B; font-size:13px; margin:3px 0; }
  .footer { margin-top:40px; color:#94A3B8; font-size:11px; text-align:center; }
`;

const estadoBadge = (estado?: string) =>
  `<span class="badge ${estado ?? 'pendiente'}">${estado === 'pagado' ? 'Pagado' : estado === 'parcial' ? 'Parcial' : 'Pendiente'}</span>`;

const estadoBadgeLadoCobro = (estado?: string) =>
  `<span class="badge ${estado ?? 'pendiente'}">${estado === 'pagado' ? 'Cobrado' : estado === 'parcial' ? 'Cobro parcial' : 'Sin cobrar'}</span>`;

/** Evita romper el HTML si el usuario escribe &lt; etc. en el nombre del pedido */
const escaparHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Iconos SVG inline (expo-print / PDF no renderizan emojis de forma fiable). */
const icoUbicacion =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="#64748B" aria-hidden="true" style="vertical-align:-2px;margin-right:5px;display:inline-block"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
const icoCorreo =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="#64748B" aria-hidden="true" style="vertical-align:-2px;margin-right:5px;display:inline-block"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>';
const icoTelefono =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="#64748B" aria-hidden="true" style="vertical-align:-2px;margin-right:5px;display:inline-block"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

/** Iconos de contacto en gris oscuro (PDF cotización formal B/N). */
const icoUbicacionBn = icoUbicacion.replace(/#64748B/g, '#404040');
const icoCorreoBn = icoCorreo.replace(/#64748B/g, '#404040');
const icoTelefonoBn = icoTelefono.replace(/#64748B/g, '#404040');

/** Línea opcional NIT de cliente o proveedor en PDFs. */
const metaNitPersonaHtml = (nit?: string | null): string => {
  const t = nit?.trim();
  if (!t) return '';
  return `<p class="meta">NIT: <strong>${escaparHtml(t)}</strong></p>`;
};

const tituloPedidoPdf = (pedido: Pedido, sufijo: string): string => {
  const ref = pedido.nombreReferencia?.trim();
  if (ref) {
    return `${escaparHtml(ref)} — ${sufijo}`;
  }
  return `Pedido #${pedido.id} — ${sufijo}`;
};

const esUrlHttpsSeguraParaImg = (url: string): boolean => {
  const t = url.trim();
  return /^https:\/\//i.test(t) && !/[\s"'<>]/.test(t);
};

const escaparAttrImgSrc = (src: string): string => src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Prioriza `logoUrl` (Cloudinary u otro HTTPS); si no, data URL base64 dentro del tope. */
const resolverSrcLogoPdf = (perfil?: PerfilEmpresa | null): string | null => {
  const url = perfil?.logoUrl?.trim();
  if (url && esUrlHttpsSeguraParaImg(url)) return url;
  const b64 = perfil?.logoBase64?.trim();
  if (b64 && b64.length <= MAX_LOGO_BASE64_CHARS) return b64;
  return null;
};

/** Fondo blanco en contenedor + img para que PNG transparente no se componga sobre negro en el motor PDF. */
const imgLogoHtml = (src: string, maxH: number, maxW: number): string =>
  `<span style="display:inline-block;background:#ffffff;line-height:0;vertical-align:middle;border-radius:6px;"><img src="${escaparAttrImgSrc(
    src,
  )}" alt="" style="max-height:${maxH}px;max-width:${maxW}px;object-fit:contain;display:block;background:#ffffff;" /></span>`;

const avatarInicialEmpresaHtml = (nombre: string | null | undefined, size: number): string => {
  const inicial = nombre?.charAt(0)?.toUpperCase() ?? 'E';
  const fs = Math.round(size * 0.45);
  return `<div style="width:${size}px;height:${size}px;background:#1E3A5F;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:${fs}px;font-weight:800;">${escaparHtml(inicial)}</div>`;
};

const debeMostrarCabeceraEmpresaPdf = (perfil?: PerfilEmpresa | null): boolean => {
  if (!perfil) return false;
  return !!(
    resolverSrcLogoPdf(perfil) ||
    perfil.nombreEmpresa?.trim() ||
    perfil.nit?.trim()
  );
};

/** Cabecera compacta (logo o inicial + nombre + NIT) para PDFs cliente / proveedor / completo. */
const cabeceraEmpresaCompactaHtml = (perfil?: PerfilEmpresa | null): string => {
  if (!debeMostrarCabeceraEmpresaPdf(perfil)) return '';
  const logoSrc = resolverSrcLogoPdf(perfil);
  const img = logoSrc ? imgLogoHtml(logoSrc, 56, 168) : avatarInicialEmpresaHtml(perfil?.nombreEmpresa, 52);
  const nombre = perfil?.nombreEmpresa?.trim() || 'Mi empresa';
  const nit = perfil?.nit?.trim();
  return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #E2E8F0;">
    <div style="flex-shrink:0;">${img}</div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#1E293B;">${escaparHtml(nombre)}</div>
      ${nit ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">NIT: ${escaparHtml(nit)}</div>` : ''}
    </div>
  </div>`;
};

// ─── PDF Cliente ──────────────────────────────────────────────────────────────

const generarHTMLCliente = (pedido: Pedido, perfil?: PerfilEmpresa | null): string => {
  const resumen = pedido.resumen;
  const subSinResumen = (pedido.items ?? []).reduce((a, i) => a + i.cantidad * i.precioVenta, 0);
  const subtotal = resumen?.subtotalVenta ?? subSinResumen;
  const pct = pedido.impuesto ?? 0;
  const montoIvaFallback =
    pedido.tipo === 'venta' && pct > 0 ? Math.round(subtotal * (pct / 100) * 100) / 100 : 0;
  const montoIva = resumen?.montoImpuestoVenta ?? montoIvaFallback;
  const total = resumen?.totalVenta ?? subtotal + montoIva;
  const totalPagado = resumen?.totalPagado ?? 0;
  const refSaldo = resumen?.referenciaSaldoCliente ?? total;
  const saldo = resumen?.saldoPendiente ?? Math.max(0, refSaldo - totalPagado);
  const colorSaldo = saldo > 0 ? '#DC2626' : '#16A34A';
  const esVentaIntermediacion = pedido.tipo === 'venta' && !pedido.persona && !!pedido.proveedorId;
  const filasIva =
    montoIva > 0 && pedido.impuesto != null
      ? `<tr><td colspan="3" class="right" style="color:#64748B;">Subtotal ítems</td><td class="right">${formatearMoneda(subtotal)}</td></tr>
    <tr><td colspan="3" class="right" style="color:#64748B;">IVA (${pedido.impuesto}%)</td><td class="right">${formatearMoneda(montoIva)}</td></tr>`
      : '';

  const filasItems = (pedido.items ?? []).map((item) => {
    const subtotal = item.cantidad * item.precioVenta;
    return `<tr>
      <td>${item.nombre}</td>
      <td class="center">${item.cantidad}</td>
      <td class="right">${formatearMoneda(item.precioVenta)}</td>
      <td class="right">${formatearMoneda(subtotal)}</td>
    </tr>`;
  }).join('');

  const filasPagos = (pedido.pagos ?? []).length === 0
    ? '<p style="color:#64748B;font-size:13px;">Sin pagos registrados.</p>'
    : `<table><thead><tr><th>Fecha</th><th class="right">Monto</th></tr></thead><tbody>
        ${(pedido.pagos ?? []).map((p) => `<tr><td>${formatearFecha(p.fecha)}</td><td class="right">${formatearMoneda(p.monto)}</td></tr>`).join('')}
      </tbody></table>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>${CSS_BASE} h1 { color:#2563EB; }</style></head><body>
  ${cabeceraEmpresaCompactaHtml(perfil)}
  <h1>${tituloPedidoPdf(pedido, 'Cliente')}</h1>
  <p class="meta">Fecha: ${formatearFecha(pedido.fecha)}</p>
  <p class="meta">Cliente: <strong>${pedido.persona?.nombre?.trim() ? pedido.persona.nombre : esVentaIntermediacion ? (pedido.proveedor?.nombre ?? 'Proveedor') : '-'}</strong> <span class="badge cliente" style="margin-left:6px;">${esVentaIntermediacion ? 'Venta proveedor' : 'Cliente'}</span></p>
  ${metaNitPersonaHtml(pedido.persona?.nit)}
  <p class="meta">Estado: ${esVentaIntermediacion ? estadoBadgeLadoCobro(resumen?.estado) : estadoBadge(resumen?.estado)}</p>
  <h2>Ítems</h2>
  <table><thead><tr><th>Nombre</th><th class="center">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead>
  <tbody>${filasItems}</tbody>
  <tfoot>
    ${filasIva}
    <tr class="total-row"><td colspan="3" class="right">${montoIva > 0 ? 'Total a cobrar' : 'Total'}</td><td class="right">${formatearMoneda(total)}</td></tr>
    <tr><td colspan="3" class="right" style="color:#64748B;">${esVentaIntermediacion ? 'Total repartido' : 'Total pagado'}</td><td class="right" style="color:#16A34A;">${formatearMoneda(totalPagado)}</td></tr>
    <tr><td colspan="3" class="right" style="font-weight:700;">${esVentaIntermediacion ? 'Pendiente (margen)' : 'Saldo pendiente'}</td><td class="right" style="font-weight:700;color:${colorSaldo};">${formatearMoneda(saldo)}</td></tr>
  </tfoot></table>
  <h2>${esVentaIntermediacion ? 'Repartos recibidos' : 'Pagos recibidos'}</h2>${filasPagos}
  <p class="footer">Generado el ${new Date().toLocaleDateString('es-GT')}</p>
  </body></html>`;
};

// ─── PDF Proveedor ────────────────────────────────────────────────────────────

const generarHTMLProveedor = (pedido: Pedido, perfil?: PerfilEmpresa | null): string => {
  const resumen = pedido.resumen;
  const totalCompra = resumen?.totalCompra ?? 0;
  const totalPagadoProveedorResumen = resumen?.totalPagadoProveedor ?? 0;
  const saldoCostoApp = Math.max(0, totalCompra - totalPagadoProveedorResumen);
  const colorSaldo = saldoCostoApp > 0 ? '#DC2626' : '#16A34A';

  const listaProv = pedido.pagosProveedor ?? [];
  const listaLiquidaCosto = listaProv.filter((p) => p.tipo !== 'ingreso_cliente_a_proveedor');
  const abonosCosto = listaLiquidaCosto.filter((p) => (p.tipo ?? 'pago') === 'pago').reduce((a, p) => a + p.monto, 0);
  const cobrosCosto = listaLiquidaCosto.filter((p) => p.tipo === 'cobro').reduce((a, p) => a + p.monto, 0);

  const totalIngresosClientes = listaProv
    .filter((p) => p.tipo === 'ingreso_cliente_a_proveedor')
    .reduce((a, p) => a + p.monto, 0);
  const totalRepartosIntermediario = (pedido.pagos ?? []).reduce((a, p) => a + p.monto, 0);

  const esVentaIntermediacionPdf = pedido.tipo === 'venta' && !pedido.persona && !!pedido.proveedorId;

  const filasItems = (pedido.items ?? []).map((item) => {
    const subtotal = item.cantidad * item.precioCompra;
    return `<tr>
      <td>${item.nombre}</td>
      <td class="center">${item.cantidad}</td>
      <td class="right">${formatearMoneda(item.precioCompra)}</td>
      <td class="right">${formatearMoneda(subtotal)}</td>
    </tr>`;
  }).join('');

  const filasPagos = listaProv.length === 0
    ? '<p style="color:#64748B;font-size:13px;">Sin movimientos registrados.</p>'
    : `<table><thead><tr><th>Fecha</th><th>Tipo</th><th class="right">Monto</th></tr></thead><tbody>
        ${listaProv.map((p) => {
          const esIngreso = p.tipo === 'ingreso_cliente_a_proveedor';
          const esCobro = p.tipo === 'cobro';
          const tipoTxt = esIngreso
            ? 'Ingreso clientes al proveedor'
            : esCobro
              ? 'Cobro (te pagó)'
              : 'Pago (le pagaste)';
          return `<tr><td>${formatearFecha(p.fecha)}</td><td style="font-size:12px;">${tipoTxt}</td><td class="right">${formatearMoneda(p.monto)}</td></tr>`;
        }).join('')}
      </tbody></table>`;

  const filasRepartosInter =
    (pedido.pagos ?? []).length === 0
      ? '<p style="color:#64748B;font-size:13px;">Sin repartos registrados.</p>'
      : `<table><thead><tr><th>Fecha</th><th class="right">Monto</th></tr></thead><tbody>
          ${(pedido.pagos ?? [])
            .map(
              (p) =>
                `<tr><td>${formatearFecha(p.fecha)}</td><td class="right" style="color:#16A34A;">${formatearMoneda(p.monto)}</td></tr>`,
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr><td style="font-weight:700;">Total repartido al intermediario</td><td class="right" style="font-weight:700;color:#16A34A;">${formatearMoneda(totalRepartosIntermediario)}</td></tr>
        </tfoot>
      </table>`;

  const tfootResumen = esVentaIntermediacionPdf
    ? `<tfoot>
    <tr class="total-row"><td colspan="3" class="right">Total costo ítems</td><td class="right">${formatearMoneda(totalCompra)}</td></tr>
    <tr><td colspan="3" class="right" style="color:#64748B;">Clientes pagaron al proveedor (registrado)</td><td class="right" style="color:#2563EB;">${formatearMoneda(totalIngresosClientes)}</td></tr>
    <tr><td colspan="3" class="right" style="color:#64748B;">Repartos al intermediario (registrado)</td><td class="right" style="color:#16A34A;">${formatearMoneda(totalRepartosIntermediario)}</td></tr>
    <tr><td colspan="3" class="right" style="color:#64748B;font-size:12px;">Liquidación costo (app): pagaste ${formatearMoneda(abonosCosto)} · cobros del proveedor ${formatearMoneda(cobrosCosto)} · Total aplicado al costo</td><td class="right" style="color:#7C3AED;">${formatearMoneda(totalPagadoProveedorResumen)}</td></tr>
    <tr><td colspan="3" class="right" style="font-weight:700;">Saldo costo pendiente (app)</td><td class="right" style="font-weight:700;color:${colorSaldo};">${formatearMoneda(saldoCostoApp)}</td></tr>
  </tfoot>`
    : `<tfoot>
    <tr class="total-row"><td colspan="3" class="right">Total a pagar</td><td class="right">${formatearMoneda(totalCompra)}</td></tr>
    <tr><td colspan="3" class="right" style="color:#64748B;">Ya pagado</td><td class="right" style="color:#16A34A;">${formatearMoneda(totalPagadoProveedorResumen)}</td></tr>
    <tr><td colspan="3" class="right" style="font-weight:700;">Saldo Pendiente</td><td class="right" style="font-weight:700;color:${colorSaldo};">${formatearMoneda(saldoCostoApp)}</td></tr>
  </tfoot>`;

  const metaEstado = esVentaIntermediacionPdf
    ? `<p class="meta">Estado reparto / margen: ${estadoBadgeLadoCobro(resumen?.estado)}</p>
  <p class="meta">Estado liquidación costo (app): ${estadoBadge(resumen?.estadoProveedor)}</p>
  <p class="meta" style="font-size:12px;">En venta con proveedor, «ingresos de clientes» son referencia de flujo; no sustituyen el costo ítems salvo que registres pagos/cobros de costo.</p>`
    : `<p class="meta">Estado pago: ${estadoBadge(resumen?.estadoProveedor)}</p>`;

  const bloqueRepartos = esVentaIntermediacionPdf
    ? `<h2>Repartos al intermediario</h2>${filasRepartosInter}`
    : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>${CSS_BASE} h1 { color:#7C3AED; }</style></head><body>
  ${cabeceraEmpresaCompactaHtml(perfil)}
  <h1>${tituloPedidoPdf(pedido, 'Proveedor')}</h1>
  <p class="meta">Fecha: ${formatearFecha(pedido.fecha)}</p>
  <p class="meta">Proveedor: <strong>${pedido.proveedor?.nombre ?? '-'}</strong> <span class="badge proveedor" style="margin-left:6px;">Proveedor</span></p>
  ${metaNitPersonaHtml(pedido.proveedor?.nit)}
  ${metaEstado}
  <h2>Ítems (precio de costo)</h2>
  <table><thead><tr><th>Nombre</th><th class="center">Cant.</th><th class="right">Costo unit.</th><th class="right">Subtotal</th></tr></thead>
  <tbody>${filasItems}</tbody>
  ${tfootResumen}</table>
  <h2>Movimientos con el proveedor</h2>${filasPagos}
  ${bloqueRepartos}
  <p class="footer">Generado el ${new Date().toLocaleDateString('es-GT')}</p>
  </body></html>`;
};

// ─── PDF Completo / Triangulado ───────────────────────────────────────────────

const generarHTMLCompleto = (pedido: Pedido, perfil?: PerfilEmpresa | null): string => {
  const resumen = pedido.resumen;
  const subtotalVenta = resumen?.subtotalVenta ?? (pedido.items ?? []).reduce((a, i) => a + i.cantidad * i.precioVenta, 0);
  const pctPed = pedido.impuesto ?? 0;
  const montoIvaFb =
    pedido.tipo === 'venta' && pctPed > 0 ? Math.round(subtotalVenta * (pctPed / 100) * 100) / 100 : 0;
  const montoIvaVenta = resumen?.montoImpuestoVenta ?? montoIvaFb;
  const totalVenta = resumen?.totalVenta ?? subtotalVenta + montoIvaVenta;
  const totalCompra = resumen?.totalCompra ?? 0;
  const cobradoCliente = resumen?.totalPagado ?? 0;
  const pagadoProveedor = resumen?.totalPagadoProveedor ?? 0;
  const listaProv = pedido.pagosProveedor ?? [];
  const listaProvLiquidaCosto = listaProv.filter((p) => p.tipo !== 'ingreso_cliente_a_proveedor');
  const abonosProvPdf = listaProvLiquidaCosto.filter((p) => (p.tipo ?? 'pago') === 'pago').reduce((a, p) => a + p.monto, 0);
  const cobrosProvPdf = listaProvLiquidaCosto.filter((p) => p.tipo === 'cobro').reduce((a, p) => a + p.monto, 0);
  const refClientePdf = resumen?.referenciaSaldoCliente ?? totalVenta;
  const saldoCliente = resumen?.saldoPendiente ?? Math.max(0, refClientePdf - cobradoCliente);
  const saldoProveedor = Math.max(0, totalCompra - pagadoProveedor);
  const margenPotencial = totalVenta - totalCompra;
  const filasTotalesVentaIva =
    montoIvaVenta > 0 && pedido.impuesto != null
      ? `<tr><td colspan="2" class="right" style="color:#64748B;">Subtotal venta ítems</td><td class="right">${formatearMoneda(subtotalVenta)}</td><td></td><td></td></tr>
    <tr><td colspan="2" class="right" style="color:#64748B;">IVA (${pedido.impuesto}%)</td><td class="right">${formatearMoneda(montoIvaVenta)}</td><td></td><td></td></tr>`
      : '';
  const gananciaReal = cobradoCliente - abonosProvPdf + cobrosProvPdf;
  const colorGanancia = gananciaReal >= 0 ? '#16A34A' : '#DC2626';
  const nombreClienteCompleto =
    pedido.persona?.nombre?.trim()
      ? pedido.persona.nombre
      : pedido.tipo === 'venta' && pedido.proveedor
        ? pedido.nombreReferencia?.trim() || pedido.proveedor.nombre || 'Venta proveedor'
        : '-';

  const filasItems = (pedido.items ?? []).map((item) => `<tr>
    <td>${item.nombre}</td>
    <td class="center">${item.cantidad}</td>
    <td class="right">${formatearMoneda(item.precioCompra)}</td>
    <td class="right">${formatearMoneda(item.precioVenta)}</td>
    <td class="right">${formatearMoneda(item.cantidad * (item.precioVenta - item.precioCompra))}</td>
  </tr>`).join('');

  const filasPagosCliente = (pedido.pagos ?? []).map((p) =>
    `<tr><td>${formatearFecha(p.fecha)}</td><td class="right" style="color:#2563EB;">${formatearMoneda(p.monto)}</td></tr>`
  ).join('');

  const filasPagosProveedor = (pedido.pagosProveedor ?? []).map((p) => {
    const esIngreso = p.tipo === 'ingreso_cliente_a_proveedor';
    const esCobro = p.tipo === 'cobro';
    const tipoTxt = esIngreso ? 'Ingreso clientes' : esCobro ? 'Cobro' : 'Pago';
    const col = esIngreso ? '#2563EB' : esCobro ? '#16A34A' : '#7C3AED';
    return `<tr><td>${formatearFecha(p.fecha)}</td><td style="font-size:12px;color:${col};">${tipoTxt}</td><td class="right" style="color:${col};">${formatearMoneda(p.monto)}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>${CSS_BASE}
    h1 { color:#059669; }
    .ganancia-box { background:#F0FDF4; border:2px solid #059669; border-radius:10px; padding:16px; margin:20px 0; }
    .ganancia-row { display:flex; justify-content:space-between; margin:6px 0; font-size:14px; }
    .ganancia-total { font-size:20px; font-weight:700; text-align:center; margin-top:12px; padding-top:12px; border-top:1px solid #D1FAE5; }
    .dos-col { display:flex; gap:20px; }
    .col { flex:1; }
  </style></head><body>
  ${cabeceraEmpresaCompactaHtml(perfil)}
  <h1>${tituloPedidoPdf(pedido, 'Resumen Completo')}</h1>
  <p class="meta">Fecha: ${formatearFecha(pedido.fecha)}</p>
  <p class="meta">
    Cliente: <strong>${escaparHtml(nombreClienteCompleto)}</strong>
    &nbsp;·&nbsp;
    Proveedor: <strong>${pedido.proveedor?.nombre ?? '-'}</strong>
  </p>
  ${metaNitPersonaHtml(pedido.persona?.nit)}
  ${metaNitPersonaHtml(pedido.proveedor?.nit)}

  <h2>Ítems</h2>
  <table><thead><tr>
    <th>Nombre</th><th class="center">Cant.</th>
    <th class="right">Costo</th><th class="right">Venta</th><th class="right">Margen</th>
  </tr></thead>
  <tbody>${filasItems}</tbody>
  <tfoot>
    ${filasTotalesVentaIva}
    <tr class="total-row">
      <td colspan="2" class="right">${montoIvaVenta > 0 ? 'Totales (costo · venta con IVA)' : 'Totales'}</td>
      <td class="right">${formatearMoneda(totalCompra)}</td>
      <td class="right">${formatearMoneda(totalVenta)}</td>
      <td class="right" style="color:#059669;">${formatearMoneda(margenPotencial)}</td>
    </tr>
  </tfoot></table>

  <div class="dos-col" style="margin-top:20px;">
    <div class="col">
      <h2 style="color:#2563EB;">Pagos del cliente</h2>
      <table><thead><tr><th>Fecha</th><th class="right">Monto</th></tr></thead>
      <tbody>${filasPagosCliente || '<tr><td colspan="2" style="color:#64748B;">Sin pagos</td></tr>'}</tbody>
      <tfoot>
        <tr><td style="font-weight:700;">Cobrado</td><td class="right" style="color:#2563EB;font-weight:700;">${formatearMoneda(cobradoCliente)}</td></tr>
        <tr><td style="color:#DC2626;">Pendiente</td><td class="right" style="color:#DC2626;">${formatearMoneda(saldoCliente)}</td></tr>
      </tfoot></table>
    </div>
    <div class="col">
      <h2 style="color:#7C3AED;">Proveedor (pagos y cobros)</h2>
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th class="right">Monto</th></tr></thead>
      <tbody>${filasPagosProveedor || '<tr><td colspan="3" style="color:#64748B;">Sin movimientos</td></tr>'}</tbody>
      <tfoot>
        <tr><td colspan="2" style="font-weight:700;">Liquidado (abonos − cobros en neto: ${formatearMoneda(abonosProvPdf - cobrosProvPdf)})</td><td class="right" style="color:#7C3AED;font-weight:700;">${formatearMoneda(pagadoProveedor)}</td></tr>
        <tr><td colspan="2" style="color:#DC2626;">Pendiente costo</td><td class="right" style="color:#DC2626;">${formatearMoneda(saldoProveedor)}</td></tr>
      </tfoot></table>
    </div>
  </div>

  <div class="ganancia-box">
    <div class="ganancia-row"><span>Cobrado al cliente</span><span style="color:#2563EB;font-weight:600;">${formatearMoneda(cobradoCliente)}</span></div>
    <div class="ganancia-row"><span>Neto proveedor (pagaste − te pagó)</span><span style="color:#7C3AED;font-weight:600;">− ${formatearMoneda(abonosProvPdf - cobrosProvPdf)}</span></div>
    <div class="ganancia-total" style="color:${colorGanancia};">
      Ganancia real: ${formatearMoneda(gananciaReal)}
    </div>
    <p style="font-size:11px;color:#64748B;text-align:center;margin-top:8px;">
      Margen potencial (total a cobrar al cliente − costo): ${formatearMoneda(margenPotencial)}
    </p>
  </div>

  <p class="footer">Generado el ${new Date().toLocaleDateString('es-GT')}</p>
  </body></html>`;
};

// ─── PDF Cotización profesional ───────────────────────────────────────────────

export const generarHTMLCotizacion = (pedido: Pedido, perfil?: PerfilEmpresa | null): string => {
  const empresaRaw =
    perfil ??
    ({
      walletId: 0,
      nombreEmpresa: null,
      logoBase64: null,
      logoUrl: null,
      direccion: null,
      email: null,
      telefono: null,
      nit: null,
    } as PerfilEmpresa);
  const logoSrc = resolverSrcLogoPdf(empresaRaw);
  const empresa = empresaRaw;
  const cliente = pedido.persona;
  const items = pedido.items ?? [];
  const fecha = formatearFecha(pedido.fecha);
  const numCotizacion = `COT-${String(pedido.id).padStart(5, '0')}`;

  const r = pedido.resumen;
  const subtotalItems = items.reduce((acc, item) => acc + item.cantidad * item.precioVenta, 0);
  const subtotal = r?.subtotalVenta ?? subtotalItems;
  const pct = pedido.impuesto ?? 0;
  const montoImpuesto = r?.montoImpuestoVenta ?? (pct > 0 ? Math.round(subtotal * (pct / 100) * 100) / 100 : 0);
  const total = r?.totalVenta ?? subtotal + montoImpuesto;

  const filasItems = items.map((item, i) => {
    const subtotalItem = item.cantidad * item.precioVenta;
    const bg = i % 2 === 0 ? '#ffffff' : '#f4f4f4';
    return `<tr style="background:${bg};">
      <td style="padding:10px 12px;border-bottom:1px solid #d0d0d0;color:#111;">${item.nombre}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #d0d0d0;text-align:center;color:#111;">${item.cantidad}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #d0d0d0;text-align:right;color:#111;">${formatearMoneda(item.precioVenta)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #d0d0d0;text-align:right;font-weight:600;color:#000;">${formatearMoneda(subtotalItem)}</td>
    </tr>`;
  }).join('');

  /** Logo a color: sin filtros CSS; el resto del documento es solo grises y negro. */
  const logoImgHtml = logoSrc ? imgLogoHtml(logoSrc, 96, 280) : '';
  const inicialEmpresa = empresa.nombreEmpresa?.charAt(0)?.toUpperCase() ?? 'E';
  const avatarEmpresa = `<div style="width:56px;height:56px;background:#1a1a1a;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:800;border:1px solid #333;">${escaparHtml(inicialEmpresa)}</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    /* Documento formal en blanco y negro; el logo (imagen) conserva color — no usar filter en body. */
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111111; background: #ffffff; padding: 40px 44px; font-size: 13px; line-height: 1.5; }

    .cot-logo-wrap { display: flex; justify-content: center; align-items: center; margin-bottom: 28px; }
    .top-bar { display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #000000; }
    .top-title { text-align: right; flex-shrink: 0; }
    .top-title h1 { font-size: 30px; font-weight: 800; color: #000000; letter-spacing: -0.5px; }
    .top-title .num { font-size: 13px; color: #444444; margin-top: 4px; }
    .top-title .fecha-badge { display: inline-block; margin-top: 8px; background: #f0f0f0; color: #000000; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 99px; border: 1px solid #b0b0b0; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border: 1px solid #888888; border-radius: 10px; overflow: hidden; margin-bottom: 28px; }
    .info-col + .info-col { border-left: 1px solid #888888; }
    .info-label { background: #000000; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; padding: 8px 14px; }
    .info-body { padding: 14px 14px; }
    .info-name { font-size: 14px; font-weight: 700; color: #000000; margin-bottom: 8px; }
    .info-row { font-size: 12px; color: #333333; margin-bottom: 4px; }
    .info-empty { font-size: 12px; color: #666666; font-style: italic; }
    .cot-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 5px 0; border-bottom: 1px dashed #bbbbbb; }
    .cot-row:last-child { border-bottom: none; }
    .cot-key { color: #555555; }
    .cot-val { font-weight: 700; color: #000000; }

    .tabla-wrap { border: 1px solid #888888; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead tr { background: #000000; }
    table.items thead th { color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 11px 12px; text-align: left; }
    table.items thead th.r { text-align: right; }
    table.items thead th.c { text-align: center; }

    .totales-wrap { display: flex; justify-content: flex-end; margin-bottom: 48px; }
    .totales-box { border: 1px solid #888888; border-radius: 10px; overflow: hidden; min-width: 300px; }
    .totales-box table { width: 100%; border-collapse: collapse; }
    .totales-title td { background: #e8e8e8; font-size: 10px; font-weight: 700; color: #333333; text-transform: uppercase; letter-spacing: .8px; padding: 8px 16px; border-bottom: 1px solid #c0c0c0; }
    .totales-box td { padding: 9px 16px; font-size: 13px; color: #333333; }
    .totales-box td:last-child { text-align: right; font-weight: 600; color: #000000; }
    .totales-box tr.sep td { border-top: 1px solid #c0c0c0; }
    .totales-box tr.grand td { background: #000000; color: #ffffff !important; font-size: 15px; font-weight: 800; }

    .footer { text-align: center; color: #555555; font-size: 11px; border-top: 1px solid #cccccc; padding-top: 16px; line-height: 1.8; }
  </style>
</head>
<body>

  <div class="cot-logo-wrap">
    ${logoSrc ? logoImgHtml : avatarEmpresa}
  </div>

  <div class="top-bar">
    <div class="top-title">
      <h1>COTIZACIÓN</h1>
      <div class="num">${numCotizacion}</div>
      ${
        pedido.nombreReferencia?.trim()
          ? `<div style="font-size:15px;font-weight:700;color:#000000;margin-top:8px;">${escaparHtml(pedido.nombreReferencia.trim())}</div>`
          : ''
      }
      <div class="fecha-badge">Fecha: ${fecha}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-col">
      <div class="info-label">Emitido por</div>
      <div class="info-body">
        <div class="info-name">${escaparHtml(empresa.nombreEmpresa ?? '—')}</div>
        ${empresa.nit?.trim() ? `<div class="info-row" style="font-weight:600;">NIT: ${escaparHtml(empresa.nit.trim())}</div>` : ''}
        ${empresa.direccion ? `<div class="info-row">${icoUbicacionBn}${escaparHtml(empresa.direccion)}</div>` : ''}
        ${empresa.email ? `<div class="info-row">${icoCorreoBn}${escaparHtml(empresa.email)}</div>` : ''}
        ${empresa.telefono ? `<div class="info-row">${icoTelefonoBn}${escaparHtml(empresa.telefono)}</div>` : ''}
        ${
          !empresa.direccion && !empresa.email && !empresa.telefono && !empresa.nit?.trim()
            ? '<div class="info-empty">Sin datos de contacto</div>'
            : ''
        }
      </div>
    </div>
    <div class="info-col">
      <div class="info-label">Cliente</div>
      <div class="info-body">
        <div class="info-name">${cliente?.nombre ?? '—'}</div>
        ${cliente?.nit?.trim() ? `<div class="info-row" style="font-weight:600;">NIT: ${escaparHtml(cliente.nit.trim())}</div>` : ''}
        ${cliente?.direccion ? `<div class="info-row">${icoUbicacionBn}${escaparHtml(cliente.direccion)}</div>` : ''}
        ${cliente?.email ? `<div class="info-row">${icoCorreoBn}${escaparHtml(cliente.email)}</div>` : ''}
        ${cliente?.telefono ? `<div class="info-row">${icoTelefonoBn}${escaparHtml(cliente.telefono)}</div>` : ''}
        ${!cliente?.direccion && !cliente?.email && !cliente?.telefono && !cliente?.nit?.trim() ? '<div class="info-empty">Sin datos de contacto</div>' : ''}
      </div>
    </div>
    <div class="info-col">
      <div class="info-label">Datos de cotización</div>
      <div class="info-body">
        <div class="cot-row"><span class="cot-key">Nº cotización</span><span class="cot-val">${numCotizacion}</span></div>
        ${
          pedido.nombreReferencia?.trim()
            ? `<div class="cot-row"><span class="cot-key">Referencia</span><span class="cot-val">${escaparHtml(pedido.nombreReferencia.trim())}</span></div>`
            : ''
        }
        <div class="cot-row"><span class="cot-key">Fecha</span><span class="cot-val">${fecha}</span></div>
        <div class="cot-row"><span class="cot-key">Moneda</span><span class="cot-val">GTQ (Q)</span></div>
        ${pct > 0 ? `<div class="cot-row"><span class="cot-key">Impuesto</span><span class="cot-val">${pct}%</span></div>` : ''}
      </div>
    </div>
  </div>

  <div class="tabla-wrap">
    <table class="items">
      <thead>
        <tr>
          <th style="width:44%">Descripción</th>
          <th class="c" style="width:12%">Cant.</th>
          <th class="r" style="width:22%">Precio unit.</th>
          <th class="r" style="width:22%">Total</th>
        </tr>
      </thead>
      <tbody>${filasItems}</tbody>
    </table>
  </div>

  <div class="totales-wrap">
    <div class="totales-box">
      <table>
        <tr class="totales-title"><td colspan="2">Resumen de totales</td></tr>
        <tr><td>Subtotal</td><td>${formatearMoneda(subtotal)}</td></tr>
        ${pct > 0 ? `<tr class="sep"><td>Impuesto (${pct}%)</td><td>${formatearMoneda(montoImpuesto)}</td></tr>` : ''}
        <tr class="grand sep"><td>TOTAL</td><td>${formatearMoneda(total)}</td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    <div>${empresa.nombreEmpresa ?? ''} &nbsp;·&nbsp; ${empresa.email ?? ''} &nbsp;·&nbsp; ${empresa.telefono ?? ''}</div>
    <div style="margin-top:4px;">Cotización generada el ${fecha} · Válida sujeto a confirmación de disponibilidad</div>
  </div>

</body>
</html>`;
};

// ─── PDF Recibo asesoría mensual (periodo pagado) ─────────────────────────────

const MESES_RECIBO_ASESORIA = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const etiquetaPeriodoReciboAsesoria = (anio: number, mes: number): string =>
  `${MESES_RECIBO_ASESORIA[mes - 1] ?? String(mes)} ${anio}`;

const generarHTMLReciboAsesoria = (
  cobro: AsesoriaCobro,
  personaNombre: string,
  personaNit: string | null | undefined,
  perfil?: PerfilEmpresa | null,
): string => {
  const periodo = etiquetaPeriodoReciboAsesoria(cobro.anio, cobro.mes);
  const fechaPago = cobro.fechaPago ? formatearFecha(cobro.fechaPago) : '—';
  const filaIva =
    cobro.montoIva > 0
      ? `<tr><td>IVA</td><td class="right">${formatearMoneda(cobro.montoIva)}</td></tr>`
      : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>${CSS_BASE} h1 { color:#15803d; }</style></head><body>
  ${cabeceraEmpresaCompactaHtml(perfil)}
  <h1>Recibo de pago</h1>
  <p class="meta">Concepto: <strong>Asesoría mensual</strong></p>
  <p class="meta">Periodo facturado: <strong>${escaparHtml(periodo)}</strong></p>
  <p class="meta">Cliente: <strong>${escaparHtml(personaNombre.trim() || 'Cliente')}</strong></p>
  ${metaNitPersonaHtml(personaNit)}
  <p class="meta">Estado del periodo: <span class="badge pagado" style="margin-left:4px;">Pagado</span></p>
  <p class="meta">Fecha en que se registró el cobro: <strong>${escaparHtml(fechaPago)}</strong></p>
  <h2>Importes</h2>
  <table>
    <thead><tr><th>Descripción</th><th class="right">Monto</th></tr></thead>
    <tbody>
      <tr><td>Asesoría mensual (${escaparHtml(periodo)}) — base</td><td class="right">${formatearMoneda(cobro.montoBase)}</td></tr>
      ${filaIva}
    </tbody>
    <tfoot>
      <tr class="total-row"><td>Total recibido</td><td class="right">${formatearMoneda(cobro.montoTotal)}</td></tr>
    </tfoot>
  </table>
  <p style="margin-top:20px;font-size:12px;color:#64748B;line-height:1.5;">
    Este documento sirve como comprobante de pago del periodo indicado. Recibo interno #${cobro.id}.
  </p>
  <p class="footer">Generado el ${new Date().toLocaleDateString('es-GT')}</p>
  </body></html>`;
};

async function imprimirYCompartirHtml(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    void dialogTitle;
    await imprimirHtmlEnWeb(html);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });

  const opcionesShare = {
    mimeType: 'application/pdf' as const,
    dialogTitle,
    ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' as const } : {}),
  };

  const compartir = async (): Promise<void> => {
    const disponible = await Sharing.isAvailableAsync();
    if (!disponible) {
      try {
        await Print.printAsync({ uri });
      } catch {
        /* panel cerrado sin imprimir */
      }
      return;
    }

    await esperar(Platform.OS === 'android' ? 500 : 400);

    const compartirProm = Sharing.shareAsync(uri, opcionesShare)
      .then(() => 'hecho' as const)
      .catch(() => ({ error: true } as const));
    const resultado = await Promise.race([
      compartirProm,
      esperar(800).then(() => 'timeout' as const),
    ]);
    if (resultado === 'timeout') {
      void compartirProm.catch(() => {});
      return;
    }
    if (resultado === 'hecho') {
      return;
    }
    try {
      await Print.printAsync({ uri });
    } catch {
      /* panel cerrado sin imprimir */
    }
  };

  try {
    await compartir();
  } catch {
    try {
      await Print.printAsync({ uri });
    } catch {
      /* */
    }
  }
}

// ─── Exportar ─────────────────────────────────────────────────────────────────

export const generarHTML = (pedido: Pedido, perfil?: PerfilEmpresa | null): string =>
  generarHTMLCliente(pedido, perfil);

/** PDF recibo de un periodo de asesoría mensual ya marcado como pagado (compartir / imprimir). */
export const generarYCompartirPdfReciboAsesoria = async (
  cobro: AsesoriaCobro,
  opciones: { personaNombre: string; personaNit?: string | null; perfil?: PerfilEmpresa | null },
): Promise<void> => {
  if (cobro.estado !== 'pagada') {
    throw new Error('Solo podés generar el recibo cuando el periodo está marcado como pagado.');
  }
  if (!cobro.fechaPago) {
    throw new Error('No hay fecha de pago registrada para este periodo.');
  }
  const html = generarHTMLReciboAsesoria(cobro, opciones.personaNombre, opciones.personaNit, opciones.perfil);
  const periodo = etiquetaPeriodoReciboAsesoria(cobro.anio, cobro.mes);
  const nombreCorto = opciones.personaNombre.trim().slice(0, 28) || 'Cliente';
  const titulo = `Recibo asesoría ${periodo} · ${nombreCorto}`;
  await imprimirYCompartirHtml(html, titulo);
};

export const generarYCompartirPDF = async (
  pedido: Pedido,
  tipo: TipoPDF = 'cliente',
  perfil?: PerfilEmpresa | null,
): Promise<void> => {
  const ventaIntermediacionSinClienteEnApp =
    pedido.tipo === 'venta' &&
    (pedido.personaId == null || pedido.personaId === undefined) &&
    pedido.persona == null &&
    !!pedido.proveedorId;

  if (!pedido.persona && !ventaIntermediacionSinClienteEnApp) {
    throw new Error('El pedido no tiene persona asociada.');
  }

  if (tipo === 'cotizacion' && !pedido.persona) {
    throw new Error('La cotización requiere un cliente asociado al pedido.');
  }

  if ((tipo === 'proveedor' || tipo === 'completo') && !pedido.proveedor) {
    throw new Error('Este pedido no tiene proveedor asociado para generar este tipo de PDF.');
  }

  let html: string;
  let titulo: string;

  const sufijoArchivo = (s: string) => {
    const ref = pedido.nombreReferencia?.trim();
    if (ref) return `${ref.slice(0, 40)} · #${pedido.id} - ${s}`;
    return `Pedido #${pedido.id} - ${s}`;
  };

  switch (tipo) {
    case 'proveedor':
      html = generarHTMLProveedor(pedido, perfil);
      titulo = sufijoArchivo('Proveedor');
      break;
    case 'completo':
      html = generarHTMLCompleto(pedido, perfil);
      titulo = sufijoArchivo('Completo');
      break;
    case 'cotizacion':
      html = generarHTMLCotizacion(pedido, perfil);
      titulo = pedido.nombreReferencia?.trim()
        ? `${pedido.nombreReferencia.trim().slice(0, 36)} · COT-${String(pedido.id).padStart(5, '0')}`
        : `Cotizacion COT-${String(pedido.id).padStart(5, '0')}`;
      break;
    default:
      html = generarHTMLCliente(pedido, perfil);
      titulo = sufijoArchivo('Cliente');
  }

  await imprimirYCompartirHtml(html, titulo);
};
