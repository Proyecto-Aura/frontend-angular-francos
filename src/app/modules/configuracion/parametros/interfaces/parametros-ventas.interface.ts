/** Rango del umbral mayorista (RF-A193): igual que el que valida el backend. */
export const UMBRAL_MINIMO = 2;
export const UMBRAL_MAXIMO = 10000;

export interface ParametrosVentas {
  umbralGlobal: number;
  umbralPorProducto: boolean;
  promocionesActivas: boolean;
  culqiActivo: boolean;
  efectivoActivo: boolean;
}

/** Presentación con precio mayorista, con su umbral propio (null: usa el global). */
export interface PresentacionMayorista {
  id: number;
  sku: string;
  producto: string;
  presentacion: string;
  umbralPropio: number | null;
}

export interface Promocion {
  id: number;
  nombre: string;
  tipo: string;
  vigencia: string;
  activa: boolean;
  vigente: boolean;
}

/** Umbral propio editado en pantalla y todavía sin guardar. `valor` vacío = quitarlo. */
export interface EdicionUmbral {
  id: number;
  original: number | null;
  valor: string;
}

export interface ErroresParametros {
  umbral?: string;
  pagos?: string;
}

const ENTERO = /^\d+$/;

/** Mensaje de error del umbral global, o `null` si es válido. */
export function validarUmbralGlobal(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return 'Ingresa el umbral';
  return mensajeDeRango(texto);
}

/** Mensaje de error de un umbral propio. Vacío es válido: la presentación usa el global. */
export function validarUmbralPropio(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  return mensajeDeRango(texto);
}

function mensajeDeRango(texto: string): string | null {
  const numero = Number(texto);
  if (!ENTERO.test(texto) || numero < UMBRAL_MINIMO || numero > UMBRAL_MAXIMO) {
    return `Entre ${UMBRAL_MINIMO} y ${UMBRAL_MAXIMO.toLocaleString('en-US')} unidades`;
  }
  return null;
}

/** El umbral propio que representa el texto: vacío es `null` (usa el global). */
export function umbralDeTexto(valor: string): number | null {
  const texto = valor.trim();
  return texto ? Number(texto) : null;
}

/** Una edición es un cambio real solo si el valor difiere del que ya tenía guardado. */
export function esCambioDeUmbral(edicion: EdicionUmbral): boolean {
  return umbralDeTexto(edicion.valor) !== edicion.original;
}

/** Errores de la pantalla completa; vacío significa que se puede guardar. */
export function validarParametros(p: ParametrosVentas, umbralTexto: string): ErroresParametros {
  const errores: ErroresParametros = {};
  const umbral = validarUmbralGlobal(umbralTexto);
  if (umbral) errores.umbral = umbral;
  if (!p.culqiActivo && !p.efectivoActivo) {
    errores.pagos = 'Debe quedar al menos un método de pago activo';
  }
  return errores;
}

/** Solo los campos que cambiaron entre lo guardado y lo editado. */
export function cambiosDeParametros(
  guardado: ParametrosVentas,
  editado: ParametrosVentas,
): Partial<ParametrosVentas> {
  const cambios: Partial<ParametrosVentas> = {};
  for (const clave of Object.keys(guardado) as (keyof ParametrosVentas)[]) {
    if (guardado[clave] !== editado[clave]) {
      (cambios as Record<string, unknown>)[clave] = editado[clave];
    }
  }
  return cambios;
}

export const ETIQUETA_TIPO_PROMOCION: Record<string, string> = {
  porcentaje: 'Descuento',
  monto_fijo: 'Monto fijo',
  nxm: 'Cantidad',
  regalo: 'Regalo',
};
