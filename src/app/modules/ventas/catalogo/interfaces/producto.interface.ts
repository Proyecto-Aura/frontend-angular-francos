// Modelo y reglas del catálogo — portados desde la lógica real del diseño
// (FrancoSPortalEmpresarialDesignSystem), igual que en clientes.

export type EstadoPresentacion = 'Activo' | 'Inactivo';
export type Disponibilidad = 'disponible' | 'bajo' | 'agotado';

export interface Promocion {
  pct: number;
  ini: string;
  fin: string;
}

export interface Presentacion {
  id: number;
  nombre: string;
  precioUnit: number;
  precioMayor: number;
  umbral: number; // cantidad desde la que aplica precio mayorista
  promo: Promocion | null;
  imagen: string;
  visible: boolean;
  estado: EstadoPresentacion;
  stock: number;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  destacado: boolean;
  presentaciones: Presentacion[];
}

/** Una fila del catálogo = una presentación de un producto (así lo lista el diseño). */
export interface FilaCatalogo {
  productoId: number;
  presentacionId: number;
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
      sku: skuDe(p.id, pr.id),
    })),
  );
}

// ───────────────────────── Formulario de producto ─────────────────────────
// Los <app-ds-input> emiten string, por eso los campos numéricos del formulario
// son string y se convierten a number al guardar (igual que el diseño).

export interface PresentacionForm {
  id: number | null; // null = presentación nueva (su id/SKU se asigna al guardar)
  nombre: string;
  unidad: string;
  precioUnit: string;
  precioMayor: string;
  umbral: string;
  imagen: string;
  estado: EstadoPresentacion;
  visible: boolean;
  stock: number;
  promoActiva: boolean;
  promoPct: string;
  promoIni: string;
  promoFin: string;
}

export interface ProductoFormModel {
  nombre: string;
  categoria: string;
  descripcion: string;
  destacado: boolean;
  presentaciones: PresentacionForm[];
}

export const presentacionVacia = (): PresentacionForm => ({
  id: null,
  nombre: '',
  unidad: UNIDAD,
  precioUnit: '',
  precioMayor: '',
  umbral: '',
  imagen: '',
  estado: 'Activo',
  visible: false,
  stock: 0,
  promoActiva: false,
  promoPct: '',
  promoIni: '',
  promoFin: '',
});

export const productoFormVacio = (categoria: string): ProductoFormModel => ({
  nombre: '',
  categoria,
  descripcion: '',
  destacado: false,
  presentaciones: [presentacionVacia()],
});

export function formDesdeProducto(p: Producto): ProductoFormModel {
  return {
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    destacado: p.destacado,
    presentaciones: p.presentaciones.map((pr) => ({
      id: pr.id,
      nombre: pr.nombre,
      unidad: UNIDAD,
      precioUnit: String(pr.precioUnit),
      precioMayor: String(pr.precioMayor),
      umbral: String(pr.umbral),
      imagen: pr.imagen,
      estado: pr.estado,
      visible: pr.visible,
      stock: pr.stock,
      promoActiva: !!pr.promo,
      promoPct: pr.promo ? String(pr.promo.pct) : '',
      promoIni: pr.promo ? pr.promo.ini : '',
      promoFin: pr.promo ? pr.promo.fin : '',
    })),
  };
}

/** Convierte el formulario en Presentacion. `fallbackId` se usa solo para presentaciones nuevas. */
export function presentacionDesdeForm(pr: PresentacionForm, fallbackId: number): Presentacion {
  return {
    id: pr.id ?? fallbackId,
    nombre: pr.nombre,
    precioUnit: Number(pr.precioUnit),
    precioMayor: Number(pr.precioMayor),
    umbral: Number(pr.umbral),
    imagen: pr.imagen,
    visible: pr.visible,
    estado: pr.estado,
    stock: pr.stock,
    promo: pr.promoActiva ? { pct: Number(pr.promoPct), ini: pr.promoIni, fin: pr.promoFin } : null,
  };
}

/** Mismas reglas y mensajes que `validarProducto` del diseño. */
export function validarProducto(pf: ProductoFormModel): string[] {
  const e: string[] = [];
  if (!pf.nombre) e.push('nombre del producto');
  if (!pf.descripcion) e.push('descripción');
  if (!pf.presentaciones.length) e.push('al menos una presentación');
  pf.presentaciones.forEach((p, i) => {
    const n = ` (presentación ${i + 1})`;
    if (!p.nombre) e.push('nombre de la presentación' + n);
    if (!(Number(p.precioUnit) > 0)) e.push('precio unitario mayor a 0' + n);
    if (!(Number(p.precioMayor) > 0)) e.push('precio mayorista mayor a 0' + n);
    else if (Number(p.precioMayor) > Number(p.precioUnit))
      e.push('el precio mayorista no puede superar el unitario' + n);
    if (!(Number(p.umbral) > 0)) e.push('umbral mayorista mayor a 0' + n);
    if (p.promoActiva) {
      if (!(Number(p.promoPct) > 0 && Number(p.promoPct) < 100))
        e.push('porcentaje de promoción entre 1 y 99' + n);
      if (!p.promoIni || !p.promoFin) e.push('fechas de la promoción' + n);
      else if (p.promoFin < p.promoIni) e.push('la fecha de fin debe ser posterior al inicio' + n);
    }
  });
  return e;
}

// ───────────────────────── Detalle ─────────────────────────

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const slugDe = (nombre: string, presentacion: string): string =>
  slugify(`${nombre} ${presentacion}`);

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-09-30" -> "30 Sep 2026" (igual que el diseño). */
export const fechaCorta = (iso: string): string => {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]} ${MESES[Number(p[1]) - 1]} ${p[0]}` : iso;
};

/** Peso simulado de la imagen adjunta (el diseño lo deriva del nombre del archivo). */
export const pesoImagen = (nombre: string): string => `${140 + ((nombre.length * 37) % 420)} KB`;

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
