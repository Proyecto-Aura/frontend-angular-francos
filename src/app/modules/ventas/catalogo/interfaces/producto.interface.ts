// Modelo y reglas del catálogo. Los datos llegan de la API (dto -> mapper ->
// interfaz, igual que en auth) y estas reglas son las mismas que valida el backend.
export type EstadoPresentacion = 'Activo' | 'Inactivo';

export type Disponibilidad = 'disponible' | 'bajo' | 'agotado';

export interface Promocion {
  /** Id de la promoción en el backend (para editarla o desactivarla). */
  id: number;
  pct: number;
  ini: string;
  fin: string;
}

export interface Presentacion {
  /** Id en el catálogo de presentaciones (el `PR{id}` del SKU). */
  id: number;
  /** Id de la presentación de este producto (lo que usa la API para editarla). */
  productoPresentacionId: number;
  /** Etiqueta de la presentación, por ejemplo "100 gr". */
  nombre: string;
  sku: string;
  slug: string;
  precioUnit: number;
  /** 0 si la presentación no tiene precio mayorista. */
  precioMayor: number;
  umbral: number; // cantidad desde la que aplica precio mayorista
  promo: Promocion | null;
  /** URL de la imagen ('' si no tiene). */
  imagen: string;
  visible: boolean;
  estado: EstadoPresentacion;
  stock: number;
}

export interface Producto {
  id: number;
  nombre: string;
  categoriaId: number;
  categoria: string;
  descripcion: string;
  destacado: boolean;
  presentaciones: Presentacion[];
}

/** Una fila del catálogo = una presentación de un producto (así lo lista el diseño). */
export interface FilaCatalogo {
  productoId: number;
  presentacionId: number;
  productoPresentacionId: number;
  nombre: string;
  categoria: string;
  destacado: boolean;
  presentacion: string;
  precioUnit: number;
  precioMayor: number;
  umbral: number;
  promo: Promocion | null;
  estado: EstadoPresentacion;
  stock: number;
  visible: boolean;
  sku: string;
  slug: string;
  imagen: string;
}

/** Categoría o presentación del catálogo que se ofrece en los selectores. */
export interface OpcionCatalogo {
  id: number;
  nombre: string;
  activa: boolean;
}

/** Resultado de guardar: el aviso a mostrar y si todo salió bien. */
export interface ResultadoGuardado {
  mensaje: string;
  tono: 'ok' | 'error';
}

export const UNIDAD = 'unid';

export const skuDe = (productoId: number, presentacionId: number): string =>
  `FR-P${productoId}-PR${presentacionId}`;

export const disponibilidadDe = (f: Pick<FilaCatalogo, 'stock' | 'umbral'>): Disponibilidad =>
  f.stock === 0 ? 'agotado' : f.stock < f.umbral ? 'bajo' : 'disponible';

export const money = (n: number): string =>
  'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const nf = (n: number): string => Number(n).toLocaleString('es-PE');

export function aFilas(productos: Producto[]): FilaCatalogo[] {
  return productos.flatMap((p) =>
    p.presentaciones.map((pr) => ({
      productoId: p.id,
      presentacionId: pr.id,
      productoPresentacionId: pr.productoPresentacionId,
      nombre: p.nombre,
      categoria: p.categoria,
      destacado: p.destacado,
      presentacion: pr.nombre,
      precioUnit: pr.precioUnit,
      precioMayor: pr.precioMayor,
      umbral: pr.umbral,
      promo: pr.promo,
      estado: pr.estado,
      stock: pr.stock,
      visible: pr.visible,
      sku: pr.sku,
      slug: pr.slug,
      imagen: pr.imagen,
    })),
  );
}

// ───────────────────────── Formulario de producto ─────────────────────────
// Los <app-ds-input> emiten string, por eso los campos numéricos del formulario
// son string y se convierten a number al guardar (igual que el diseño).

export interface PresentacionForm {
  /** Id de la presentación del producto; null = presentación nueva (su SKU se asigna al guardar). */
  productoPresentacionId: number | null;
  sku: string | null;
  /** Id de la presentación elegida en el selector ('' = sin elegir). */
  presentacionId: string;
  precioUnit: string;
  precioMayor: string;
  umbral: string;
  imagen: string;
  /** Id de la promoción que ya existe (null = no tiene). */
  promoId: number | null;
  promoActiva: boolean;
  promoPct: string;
  promoIni: string;
  promoFin: string;
}

export interface ProductoFormModel {
  nombre: string;
  /** Id de la categoría elegida en el selector ('' = sin elegir). */
  categoriaId: string;
  descripcion: string;
  destacado: boolean;
  presentaciones: PresentacionForm[];
}

export const presentacionVacia = (): PresentacionForm => ({
  productoPresentacionId: null,
  sku: null,
  presentacionId: '',
  precioUnit: '',
  precioMayor: '',
  umbral: '',
  imagen: '',
  promoId: null,
  promoActiva: false,
  promoPct: '',
  promoIni: '',
  promoFin: '',
});

export const productoFormVacio = (categoriaId: string): ProductoFormModel => ({
  nombre: '',
  categoriaId,
  descripcion: '',
  destacado: false,
  presentaciones: [presentacionVacia()],
});

export function formDesdeProducto(p: Producto): ProductoFormModel {
  return {
    nombre: p.nombre,
    categoriaId: String(p.categoriaId),
    descripcion: p.descripcion,
    destacado: p.destacado,
    presentaciones: p.presentaciones.map((pr) => ({
      productoPresentacionId: pr.productoPresentacionId,
      sku: pr.sku,
      presentacionId: String(pr.id),
      precioUnit: String(pr.precioUnit),
      precioMayor: pr.precioMayor ? String(pr.precioMayor) : '',
      umbral: pr.umbral ? String(pr.umbral) : '',
      imagen: pr.imagen,
      promoId: pr.promo ? pr.promo.id : null,
      promoActiva: !!pr.promo,
      promoPct: pr.promo ? String(pr.promo.pct) : '',
      promoIni: pr.promo ? pr.promo.ini : '',
      promoFin: pr.promo ? pr.promo.fin : '',
    })),
  };
}

const DOS_DECIMALES = /^\d+(\.\d{1,2})?$/;
const ENTERO = /^\d+$/;

const esUrlHttp = (valor: string): boolean => {
  try {
    const url = new URL(valor);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Mismas reglas que valida el backend, con los mensajes del diseño. */
export function validarProducto(pf: ProductoFormModel): string[] {
  const e: string[] = [];
  if (!pf.nombre.trim()) e.push('nombre del producto');
  if (!pf.categoriaId) e.push('categoría');
  if (!pf.descripcion.trim()) e.push('descripción');
  if (!pf.presentaciones.length) e.push('al menos una presentación');
  const usadas = new Set<string>();
  pf.presentaciones.forEach((p, i) => {
    const n = ` (presentación ${i + 1})`;
    if (!p.presentacionId) e.push('nombre de la presentación' + n);
    else if (usadas.has(p.presentacionId)) e.push('la presentación ya está en el producto' + n);
    else usadas.add(p.presentacionId);

    const unitarioValido = DOS_DECIMALES.test(p.precioUnit.trim()) && Number(p.precioUnit) > 0;
    if (!unitarioValido) e.push('precio unitario mayor a 0 (máx. 2 decimales)' + n);

    if (!(DOS_DECIMALES.test(p.precioMayor.trim()) && Number(p.precioMayor) > 0)) {
      e.push('precio mayorista mayor a 0 (máx. 2 decimales)' + n);
    } else if (unitarioValido && Number(p.precioMayor) >= Number(p.precioUnit)) {
      e.push('el precio mayorista debe ser menor que el unitario' + n);
    }

    if (!(ENTERO.test(p.umbral.trim()) && Number(p.umbral) > 0)) {
      e.push('umbral mayorista entero mayor a 0' + n);
    }

    if (p.imagen.trim() && !esUrlHttp(p.imagen.trim())) {
      e.push('la imagen debe ser una URL válida (http o https)' + n);
    }

    if (p.promoActiva) {
      if (!(
        DOS_DECIMALES.test(p.promoPct.trim()) &&
        Number(p.promoPct) > 0 &&
        Number(p.promoPct) < 100
      ))
        e.push('porcentaje de promoción entre 1 y 99' + n);
      if (!p.promoIni || !p.promoFin) e.push('fechas de la promoción' + n);
      else if (p.promoFin < p.promoIni) e.push('la fecha de fin debe ser posterior al inicio' + n);
    }
  });
  return e;
}

// ───────────────────────── Detalle ─────────────────────────

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-09-30" -> "30 Sep 2026" (igual que el diseño). */
export const fechaCorta = (iso: string): string => {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]} ${MESES[Number(p[1]) - 1]} ${p[0]}` : iso;
};

// ───────────────────────── Configuración del catálogo ─────────────────────────

export type CfgTab = 'categorias' | 'presentaciones';

/** Categoría o presentación de la configuración (ambas tienen nombre + descripción). */
export interface RegistroCfg {
  id: number;
  nombre: string;
  descripcion: string;
  estado: EstadoPresentacion;
}

/** Campos editables en el modal de configuración. */
export interface CfgFormModel {
  nombre: string;
  descripcion: string;
}
