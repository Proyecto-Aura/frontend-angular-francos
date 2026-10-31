import { TipoComprobanteDto } from './serie-comprobante-dto.interface';

export type EstadoSerie = 'activa' | 'por-agotar' | 'agotada' | 'inactiva';

/** Serie de comprobantes tal como la usa la pantalla. */
export interface SerieComprobante {
  id: number;
  tipo: TipoComprobanteDto;
  codigo: string;
  inicio: number;
  fin: number;
  /** Último número emitido; null si todavía no emitió ninguno. */
  ultimoEmitido: number | null;
  /** Próximo número a emitir; null si la serie se agotó. */
  siguiente: number | null;
  restantes: number;
  activa: boolean;
}

/** Una fila de la tabla: la serie con el estado que se muestra según el umbral elegido. */
export interface FilaSerie extends SerieComprobante {
  estado: EstadoSerie;
}

/** Filtros del listado: '' = todos. 'alerta' = por agotarse. */
export interface FiltrosSeries {
  tipo: '' | TipoComprobanteDto;
  estado: '' | 'activa' | 'alerta' | 'inactiva' | 'agotada';
}

export const CORRELATIVO_MAXIMO = 99_999_999;

/** Porcentajes de uso del rango a partir de los cuales una serie se avisa como por agotarse. */
export const UMBRALES_ALERTA = [70, 80, 90, 95];
export const UMBRAL_ALERTA_POR_DEFECTO = 90;
const UMBRAL_STORAGE_KEY = 'francos-series-umbral';

export const TIPOS_COMPROBANTE: { value: TipoComprobanteDto; label: string; prefijo: string }[] = [
  { value: 'factura', label: 'Factura electrónica', prefijo: 'F' },
  { value: 'boleta', label: 'Boleta de venta electrónica', prefijo: 'B' },
];

export function etiquetaDeTipo(tipo: TipoComprobanteDto): string {
  return TIPOS_COMPROBANTE.find((t) => t.value === tipo)?.label ?? tipo;
}

export function prefijoDeTipo(tipo: TipoComprobanteDto): string {
  return TIPOS_COMPROBANTE.find((t) => t.value === tipo)?.prefijo ?? '';
}

/** Número con ceros a la izquierda, como se imprime en el comprobante (8 dígitos). */
export function formatearCorrelativo(numero: number): string {
  return String(numero).padStart(8, '0');
}

/** "F001-00001848", o null si la serie no tiene número disponible. */
export function comprobanteSiguiente(serie: SerieComprobante): string | null {
  return serie.siguiente === null
    ? null
    : `${serie.codigo}-${formatearCorrelativo(serie.siguiente)}`;
}

export function formatearCantidad(cantidad: number): string {
  return cantidad.toLocaleString('es-PE');
}

/** Último número emitido; si no emitió ninguno, el anterior al inicial. */
export function ultimoNumero(serie: SerieComprobante): number {
  return serie.ultimoEmitido ?? serie.inicio - 1;
}

/** Porcentaje del rango ya emitido (0–100). */
export function porcentajeUsado(serie: SerieComprobante): number {
  const total = serie.fin - serie.inicio + 1;
  return total > 0 ? ((total - serie.restantes) / total) * 100 : 0;
}

/** "<1%" mientras se haya usado algo pero menos del 1 %; si no, el entero hacia abajo. */
export function etiquetaUso(serie: SerieComprobante): string {
  const porcentaje = porcentajeUsado(serie);
  if (porcentaje > 0 && porcentaje < 1) return '<1%';
  return `${Math.floor(porcentaje)}%`;
}

/**
 * Estado que se muestra. Una serie sin correlativos está agotada aunque esté desactivada;
 * una activa con el rango usado hasta el umbral está por agotarse.
 */
export function estadoDe(serie: SerieComprobante, umbral: number): EstadoSerie {
  if (serie.restantes <= 0) return 'agotada';
  if (!serie.activa) return 'inactiva';
  return porcentajeUsado(serie) >= umbral ? 'por-agotar' : 'activa';
}

export function filaDe(serie: SerieComprobante, umbral: number): FilaSerie {
  return { ...serie, estado: estadoDe(serie, umbral) };
}

/** Aplica los filtros de la pantalla: "Activa" incluye las que están por agotarse. */
export function coincideConFiltros(fila: FilaSerie, filtros: FiltrosSeries): boolean {
  if (filtros.tipo && fila.tipo !== filtros.tipo) return false;
  switch (filtros.estado) {
    case 'activa':
      return fila.activa && fila.estado !== 'agotada';
    case 'alerta':
      return fila.estado === 'por-agotar';
    case 'inactiva':
      return !fila.activa;
    case 'agotada':
      return fila.estado === 'agotada';
    default:
      return true;
  }
}

export const ETIQUETA_ESTADO: Record<EstadoSerie, string> = {
  activa: 'Activa',
  'por-agotar': 'Por agotarse',
  agotada: 'Agotada',
  inactiva: 'Inactiva',
};

/** El porcentaje elegido solo se recuerda en este navegador (como en el prototipo). */
export function leerUmbralGuardado(): number {
  try {
    const guardado = Number(localStorage.getItem(UMBRAL_STORAGE_KEY));
    return UMBRALES_ALERTA.includes(guardado) ? guardado : UMBRAL_ALERTA_POR_DEFECTO;
  } catch {
    return UMBRAL_ALERTA_POR_DEFECTO;
  }
}

export function guardarUmbral(umbral: number): void {
  try {
    localStorage.setItem(UMBRAL_STORAGE_KEY, String(umbral));
  } catch {
    // Sin almacenamiento disponible: el porcentaje vale solo mientras la pantalla esté abierta.
  }
}

/** Campos del formulario de crear/editar serie (los números van como texto). */
export interface SerieForm {
  tipo: TipoComprobanteDto;
  serie: string;
  inicio: string;
  fin: string;
  activa: boolean;
}

export const SERIE_FORM_VACIO: SerieForm = {
  tipo: 'factura',
  serie: '',
  inicio: '',
  fin: '',
  activa: true,
};

export function serieFormDe(serie: SerieComprobante): SerieForm {
  return {
    tipo: serie.tipo,
    serie: serie.codigo,
    inicio: String(serie.inicio),
    fin: String(serie.fin),
    activa: serie.activa,
  };
}

export type SerieErrores = Partial<Record<keyof SerieForm, string>>;

/** Una serie que ya emitió no admite cambiar tipo, código ni correlativo inicial. */
export function yaEmitio(serie: SerieComprobante | null): boolean {
  return !!serie && serie.ultimoEmitido !== null;
}

/**
 * Valida el formulario con las reglas del prototipo y del backend. Si la serie ya emitió,
 * el correlativo final solo se puede ampliar: `original` activa esa regla.
 */
export function validarSerie(form: SerieForm, original: SerieComprobante | null): SerieErrores {
  const errores: SerieErrores = {};
  const prefijo = prefijoDeTipo(form.tipo);

  if (!new RegExp(`^${prefijo}[0-9A-Z]{3}$`).test(form.serie.trim().toUpperCase())) {
    errores.serie = `Formato: ${prefijo} + 3 caracteres`;
  }

  const inicio = Number(form.inicio);
  const fin = Number(form.fin);
  const inicioValido = /^\d+$/.test(form.inicio) && inicio >= 1;
  const finValido = /^\d+$/.test(form.fin) && fin <= CORRELATIVO_MAXIMO;

  if (!inicioValido || inicio > CORRELATIVO_MAXIMO) errores.inicio = 'Mínimo 1';

  if (!finValido) errores.fin = `Máximo ${CORRELATIVO_MAXIMO}`;
  else if (inicioValido && fin <= inicio) errores.fin = 'Debe ser mayor al inicial';
  else if (original && fin < ultimoNumero(original)) {
    errores.fin = `No puede ser menor al último emitido (${ultimoNumero(original)})`;
  } else if (yaEmitio(original) && fin < original!.fin) {
    errores.fin = `Solo se puede ampliar: no menor a ${formatearCantidad(original!.fin)}`;
  }

  return errores;
}

/** Traduce los 409 del backend al campo del formulario que corresponde. */
export function conflictoDeCampo(
  mensaje: string,
): { campo: keyof SerieForm; texto: string } | null {
  if (/ya existe una serie con ese código/i.test(mensaje)) {
    return { campo: 'serie', texto: 'La serie ya existe' };
  }
  return null;
}
