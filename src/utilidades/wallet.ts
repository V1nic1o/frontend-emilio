import { TipoWallet, Wallet } from '../tipos';

/** Workspace de finanzas personales (sin pedidos/catálogo de empresa). */
export const esWalletPersonal = (w: Wallet | null | undefined): boolean => w?.tipo === 'personal';

/** Workspace de negocio (comportamiento clásico de la app). */
export const esWalletEmpresa = (w: Wallet | null | undefined): boolean => !esWalletPersonal(w);

export const tipoWalletEtiqueta = (tipo?: TipoWallet): string =>
  tipo === 'personal' ? 'Personal' : 'Empresa';
