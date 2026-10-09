import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import {
  CategoriaDto,
  PresentacionDto,
  ProductoPresentacionFilaDto,
} from '../interfaces/producto-dto.interface';
import {
  Presentacion,
  Producto,
  ProductoFormModel,
  presentacionVacia,
  productoFormVacio,
} from '../interfaces/producto.interface';

// Datos de prueba del catálogo: las mismas 9 presentaciones / 7 productos del diseño,
// pero como las devuelve la API (sirven para los specs de servicio, mapper y pantallas).
export const API = {
  productos: `${environment.apiUrl}/productos`,
  productoPresentaciones: `${environment.apiUrl}/producto-presentaciones`,
  promociones: `${environment.apiUrl}/promociones`,
  categorias: `${environment.apiUrl}/categorias`,
  presentaciones: `${environment.apiUrl}/presentaciones`,
};

export function page<T>(data: T[], pageNumber = 1, totalPages = 1) {
  return {
    data,
    meta: { total: data.length, page: pageNumber, limit: 100, total_pages: totalPages },
  };
}

export const CATEGORIAS_DTO: CategoriaDto[] = [
  { id: 1, nombre: 'Chifles', descripcion: null, estado: true },
  { id: 2, nombre: 'Camote', descripcion: null, estado: true },
  { id: 3, nombre: 'Snacks andinos', descripcion: null, estado: true },
  { id: 4, nombre: 'Frutos secos', descripcion: null, estado: true },
  { id: 5, nombre: 'Temporada', descripcion: null, estado: false },
];

export const PRESENTACIONES_DTO: PresentacionDto[] = [
  { id: 1, cantidad: 100, unidad_medida: 'gr', descripcion: null, estado: true },
  { id: 2, cantidad: 200, unidad_medida: 'gr', descripcion: null, estado: true },
  { id: 3, cantidad: 120, unidad_medida: 'gr', descripcion: null, estado: true },
  { id: 4, cantidad: 150, unidad_medida: 'gr', descripcion: null, estado: true },
  { id: 5, cantidad: 1, unidad_medida: 'kg', descripcion: null, estado: true },
  { id: 6, cantidad: 180, unidad_medida: 'gr', descripcion: null, estado: true },
  { id: 7, cantidad: 500, unidad_medida: 'gr', descripcion: null, estado: false },
];

interface FilaOpciones {
  id: number;
  productoId: number;
  nombre: string;
  categoriaId: number;
  categoria: string;
  presentacionId: number;
  cantidad: number;
  unidad: 'kg' | 'gr';
  precio: number;
  mayorista: number | null;
  umbral: number | null;
  destacado?: boolean;
  estado?: boolean;
  stock?: number;
  promo?: { id: number; valor: number; ini: string; fin: string };
  imagen?: string | null;
}

export function makeFilaDto(o: FilaOpciones): ProductoPresentacionFilaDto {
  return {
    id: o.id,
    sku: `FR-P${o.productoId}-PR${o.presentacionId}`,
    precio_unitario: o.precio,
    precio_mayorista: o.mayorista,
    umbral_mayorista: o.umbral,
    producto_id: o.productoId,
    presentacion_id: o.presentacionId,
    imagen_url: o.imagen ?? null,
    slug: `${o.nombre.toLowerCase().replace(/\s+/g, '-')}-${o.cantidad}-${o.unidad}-p${o.presentacionId}`,
    estado: o.estado ?? true,
    visible_portal_b: false,
    producto: {
      id: o.productoId,
      nombre: o.nombre,
      descripcion: `Descripción de ${o.nombre}.`,
      destacado: o.destacado ?? false,
      estado: true,
      categoria: { id: o.categoriaId, nombre: o.categoria },
    },
    presentacion: {
      id: o.presentacionId,
      cantidad: o.cantidad,
      unidad_medida: o.unidad,
      descripcion: null,
    },
    producto_terminado: {
      stock_actual: o.stock ?? 100,
      stock_minimo: 1,
      stock_maximo: null,
    },
    promocion_vigente: o.promo
      ? {
          id: o.promo.id,
          nombre: `Descuento ${o.promo.valor}%`,
          valor: o.promo.valor,
          fecha_inicio: o.promo.ini,
          fecha_fin: o.promo.fin,
        }
      : null,
  };
}

/** Las 9 filas del catálogo de ejemplo, en el orden en que las devuelve la API (por producto). */
export function catalogoDto(): ProductoPresentacionFilaDto[] {
  return [
    makeFilaDto({
      id: 11,
      productoId: 1,
      nombre: 'Chifles clásicos',
      categoriaId: 1,
      categoria: 'Chifles',
      presentacionId: 1,
      cantidad: 100,
      unidad: 'gr',
      precio: 5.5,
      mayorista: 4.2,
      umbral: 24,
      destacado: true,
      stock: 480,
      promo: { id: 91, valor: 10, ini: '2026-09-01', fin: '2026-09-30' },
      imagen: 'https://cdn.test/chifles-100.jpg',
    }),
    makeFilaDto({
      id: 12,
      productoId: 1,
      nombre: 'Chifles clásicos',
      categoriaId: 1,
      categoria: 'Chifles',
      presentacionId: 2,
      cantidad: 200,
      unidad: 'gr',
      precio: 9.9,
      mayorista: 7.9,
      umbral: 12,
      destacado: true,
      stock: 260,
    }),
    makeFilaDto({
      id: 21,
      productoId: 2,
      nombre: 'Chifles picantes',
      categoriaId: 1,
      categoria: 'Chifles',
      presentacionId: 1,
      cantidad: 100,
      unidad: 'gr',
      precio: 6,
      mayorista: 4.6,
      umbral: 24,
      destacado: true,
      stock: 320,
    }),
    makeFilaDto({
      id: 31,
      productoId: 3,
      nombre: 'Camote frito',
      categoriaId: 2,
      categoria: 'Camote',
      presentacionId: 3,
      cantidad: 120,
      unidad: 'gr',
      precio: 7.5,
      mayorista: 6,
      umbral: 18,
      stock: 210,
    }),
    makeFilaDto({
      id: 41,
      productoId: 4,
      nombre: 'Camote salado',
      categoriaId: 2,
      categoria: 'Camote',
      presentacionId: 3,
      cantidad: 120,
      unidad: 'gr',
      precio: 7.9,
      mayorista: 6.3,
      umbral: 18,
      stock: 150,
      promo: { id: 92, valor: 15, ini: '2026-09-10', fin: '2026-09-30' },
    }),
    makeFilaDto({
      id: 51,
      productoId: 5,
      nombre: 'Canchita serrana',
      categoriaId: 3,
      categoria: 'Snacks andinos',
      presentacionId: 4,
      cantidad: 150,
      unidad: 'gr',
      precio: 6.5,
      mayorista: 5.2,
      umbral: 20,
      destacado: true,
      stock: 390,
    }),
    makeFilaDto({
      id: 52,
      productoId: 5,
      nombre: 'Canchita serrana',
      categoriaId: 3,
      categoria: 'Snacks andinos',
      presentacionId: 5,
      cantidad: 1,
      unidad: 'kg',
      precio: 34,
      mayorista: 28,
      umbral: 6,
      destacado: true,
      stock: 90,
    }),
    makeFilaDto({
      id: 61,
      productoId: 6,
      nombre: 'Maní crocante',
      categoriaId: 4,
      categoria: 'Frutos secos',
      presentacionId: 6,
      cantidad: 180,
      unidad: 'gr',
      precio: 8.9,
      mayorista: 7.1,
      umbral: 15,
      stock: 175,
    }),
    makeFilaDto({
      id: 71,
      productoId: 7,
      nombre: 'Habas tostadas',
      categoriaId: 3,
      categoria: 'Snacks andinos',
      presentacionId: 4,
      cantidad: 150,
      unidad: 'gr',
      precio: 6.9,
      mayorista: 5.5,
      umbral: 20,
      stock: 0,
      estado: false,
    }),
  ];
}

type Peticion = ReturnType<HttpTestingController['expectOne']>;

function primeraPagina(httpMock: HttpTestingController, url: string): Peticion {
  return httpMock.expectOne((r) => r.url === url && r.params.get('page') === '1');
}

/** Responde las 3 lecturas que hace `CatalogoService.cargar()` (filas, categorías y presentaciones). */
export function flushCatalogo(
  httpMock: HttpTestingController,
  filas: ProductoPresentacionFilaDto[] = catalogoDto(),
  categorias: CategoriaDto[] = CATEGORIAS_DTO,
  presentaciones: PresentacionDto[] = PRESENTACIONES_DTO,
): void {
  primeraPagina(httpMock, API.productoPresentaciones).flush(page(filas));
  primeraPagina(httpMock, API.categorias).flush(page(categorias));
  primeraPagina(httpMock, API.presentaciones).flush(page(presentaciones));
}

// ───────────── Modelos de la interfaz ─────────────

export function makePresentacion(overrides: Partial<Presentacion> = {}): Presentacion {
  return {
    id: 1,
    productoPresentacionId: 11,
    nombre: '100 gr',
    sku: 'FR-P1-PR1',
    slug: 'chifles-clasicos-100-gr-p1',
    precioUnit: 5.5,
    precioMayor: 4.2,
    umbral: 24,
    promo: null,
    imagen: '',
    visible: false,
    estado: 'Activo',
    stock: 480,
    ...overrides,
  };
}

export function makeProducto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 1,
    nombre: 'Chifles clásicos',
    categoriaId: 1,
    categoria: 'Chifles',
    descripcion: 'Plátano bellaco en hojuelas.',
    destacado: true,
    presentaciones: [makePresentacion()],
    ...overrides,
  };
}

/** Formulario de un producto nuevo, completo y válido. */
export function makeFormValido(overrides: Partial<ProductoFormModel> = {}): ProductoFormModel {
  return {
    ...productoFormVacio('1'),
    nombre: 'Chifles BBQ',
    descripcion: 'Sabor BBQ.',
    presentaciones: [
      {
        ...presentacionVacia(),
        presentacionId: '1',
        precioUnit: '6',
        precioMayor: '5',
        umbral: '12',
      },
    ],
    ...overrides,
  };
}

/** Las 7 categorías de la pantalla de configuración, con descripción (una inactiva). */
export const CATEGORIAS_CFG_DTO: CategoriaDto[] = [
  { id: 1, nombre: 'Chifles', descripcion: 'Hojuelas de plátano bellaco.', estado: true },
  { id: 2, nombre: 'Camote', descripcion: 'Hojuelas de camote amarillo y morado.', estado: true },
  { id: 3, nombre: 'Canchita y maíz', descripcion: 'Canchita y maíces tostados.', estado: true },
  { id: 4, nombre: 'Maní y frutos secos', descripcion: 'Maní y pecanas.', estado: true },
  { id: 5, nombre: 'Habas y legumbres', descripcion: 'Habas y garbanzos.', estado: true },
  { id: 6, nombre: 'Mix y surtidos', descripcion: 'Combinaciones de snacks.', estado: true },
  { id: 7, nombre: 'Temporada', descripcion: 'Líneas estacionales.', estado: false },
];

/** Responde la lectura de categorías de `ConfiguracionCatalogoService.cargarCategorias()`. */
export function flushCategoriasCfg(
  httpMock: HttpTestingController,
  categorias: CategoriaDto[] = CATEGORIAS_CFG_DTO,
): void {
  primeraPagina(httpMock, API.categorias).flush(page(categorias));
}
