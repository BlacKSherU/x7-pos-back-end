/** Tipo de socio de negocio al que se asocia un recibo. */
export enum PartnerType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
}

/**
 * Alcance de los datos:
 * - merchant: solo los recibos emitidos por el merchant de la sesión.
 * - company: los recibos de todos los merchants (sucursales) de la compañía del merchant.
 */
export enum PartnerSyncScope {
  MERCHANT = 'merchant',
  COMPANY = 'company',
}

/**
 * De dónde sale el socio de un recibo:
 * - receipt: enlace explícito en el recibo (customer_id / supplier_id), hecho con LINK CUSTOMER PROFILE.
 * - order: sin enlace explícito; se usa el cliente de la orden que originó el recibo.
 */
export enum PartnerLinkSource {
  RECEIPT = 'receipt',
  ORDER = 'order',
}

/** Filtro por estado del enlace explícito. */
export enum PartnerLinkState {
  ALL = 'all',
  LINKED = 'linked',
  UNLINKED = 'unlinked',
}

/**
 * Asociación del socio con la compañía:
 * - company: proveedor (siempre de la compañía) o cliente corporativo (customer.companyId).
 * - merchant: cliente registrado solo en una sucursal (sin companyId).
 */
export enum PartnerAssociation {
  COMPANY = 'company',
  MERCHANT = 'merchant',
}

/** Orden del grid de socios. */
export enum PartnerGroupSortBy {
  VOLUME = 'volume',
  INVOICES = 'invoices',
  NAME = 'name',
  LAST_INVOICE = 'lastInvoice',
}
