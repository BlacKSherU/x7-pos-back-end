/**
 * CSV a mano (RFC 4180) para las exportaciones de reportes de facturación.
 *
 * - Separador `,` y fin de línea CRLF.
 * - Un campo va entre comillas si trae coma, comillas, CR o LF; las comillas internas se duplican.
 * - Los textos que empiezan por `=`, `+`, `-`, `@`, tabulador o CR se prefijan con `'` para que
 *   Excel/Sheets no los evalúen como fórmula (CSV injection). Los números no se tocan: un importe
 *   negativo sigue siendo un número.
 * - El documento arranca con BOM UTF-8 para que Excel abra bien los acentos.
 */

export type CsvValue = string | number | boolean | null | undefined | Date;

export const CSV_BOM = '\uFEFF';
export const CSV_EOL = '\r\n';

const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;
/** Texto que es un número plano (p. ej. un importe "-5.00"): no es una fórmula. */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_PREFIX.test(text) && !PLAIN_NUMBER.test(text)) {
    text = `'${text}`;
  }
  if (NEEDS_QUOTES.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(values: CsvValue[]): string {
  return values.map(csvCell).join(',');
}

/** Documento CSV completo: BOM + cabecera + filas, cada línea terminada en CRLF. */
export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return `${CSV_BOM}${lines.join(CSV_EOL)}${CSV_EOL}`;
}

/** Nombre de archivo seguro para `Content-Disposition` (solo [a-z0-9._-]). */
export function csvFileName(
  base: string,
  parts: Array<string | undefined>,
): string {
  const suffix = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim())
    .join('_');
  const raw = suffix ? `${base}_${suffix}` : base;
  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${safe || 'report'}.csv`;
}
