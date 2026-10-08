import { Injectable, computed, signal } from '@angular/core';
import {
  CfgFormModel,
  CfgTab,
  Producto,
  ProductoFormModel,
  RegistroCfg,
  UNIDAD,
  UnidadCfg,
  aFilas,
  presentacionDesdeForm,
  skuDe,
} from '../interfaces/producto.interface';

// TODO(backend): reemplazar MOCK_PRODUCTOS por HttpClient contra /api/ventas/catalogo
// cuando exista el endpoint — mismo patrón dto -> mapper -> interfaz que AuthService.
// Los datos son los mismos 7 productos de ejemplo del diseño original.
const MOCK_PRODUCTOS: Producto[] = [
  {
    id: 1,
    nombre: 'Chifles clásicos',
    categoria: 'Chifles',
    descripcion: 'Plátano bellaco en hojuelas, fritas y saladas al punto.',
    destacado: true,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 100 g',
        precioUnit: 5.5,
        precioMayor: 4.2,
        umbral: 24,
        promo: { pct: 10, ini: '2026-09-01', fin: '2026-09-30' },
        imagen: 'chifles-clasicos-100.jpg',
        visible: false,
        estado: 'Activo',
        stock: 480,
      },
      {
        id: 2,
        nombre: 'Bolsa 200 g',
        precioUnit: 9.9,
        precioMayor: 7.9,
        umbral: 12,
        promo: null,
        imagen: 'chifles-clasicos-200.jpg',
        visible: false,
        estado: 'Activo',
        stock: 260,
      },
    ],
  },
  {
    id: 2,
    nombre: 'Chifles picantes',
    categoria: 'Chifles',
    descripcion: 'Chifles con ají panca y limón, picor medio.',
    destacado: true,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 100 g',
        precioUnit: 6,
        precioMayor: 4.6,
        umbral: 24,
        promo: null,
        imagen: 'chifles-picantes-100.jpg',
        visible: false,
        estado: 'Activo',
        stock: 320,
      },
    ],
  },
  {
    id: 3,
    nombre: 'Camote frito',
    categoria: 'Camote',
    descripcion: 'Hojuelas de camote amarillo, crocantes y sin sal añadida.',
    destacado: false,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 120 g',
        precioUnit: 7.5,
        precioMayor: 6,
        umbral: 18,
        promo: null,
        imagen: 'camote-frito-120.jpg',
        visible: false,
        estado: 'Activo',
        stock: 210,
      },
    ],
  },
  {
    id: 4,
    nombre: 'Camote salado',
    categoria: 'Camote',
    descripcion: 'Camote en hojuelas con sal de maras.',
    destacado: false,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 120 g',
        precioUnit: 7.9,
        precioMayor: 6.3,
        umbral: 18,
        promo: { pct: 15, ini: '2026-09-10', fin: '2026-09-30' },
        imagen: 'camote-salado-120.jpg',
        visible: false,
        estado: 'Activo',
        stock: 150,
      },
    ],
  },
  {
    id: 5,
    nombre: 'Canchita serrana',
    categoria: 'Canchita y maíz',
    descripcion: 'Maíz chulpe tostado con sal, receta serrana.',
    destacado: true,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 150 g',
        precioUnit: 6.5,
        precioMayor: 5.2,
        umbral: 20,
        promo: null,
        imagen: 'canchita-150.jpg',
        visible: false,
        estado: 'Activo',
        stock: 390,
      },
      {
        id: 2,
        nombre: 'Pack x6',
        precioUnit: 34,
        precioMayor: 28,
        umbral: 6,
        promo: null,
        imagen: 'canchita-pack6.jpg',
        visible: false,
        estado: 'Activo',
        stock: 90,
      },
    ],
  },
  {
    id: 6,
    nombre: 'Maní crocante',
    categoria: 'Maní y frutos secos',
    descripcion: 'Maní tostado con cobertura crocante salada.',
    destacado: false,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 180 g',
        precioUnit: 8.9,
        precioMayor: 7.1,
        umbral: 15,
        promo: null,
        imagen: 'mani-crocante-180.jpg',
        visible: false,
        estado: 'Activo',
        stock: 175,
      },
    ],
  },
  {
    id: 7,
    nombre: 'Habas tostadas',
    categoria: 'Habas y legumbres',
    descripcion: 'Habas doradas al horno con un toque de sal.',
    destacado: false,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 150 g',
        precioUnit: 6.9,
        precioMayor: 5.5,
        umbral: 20,
        promo: null,
        imagen: 'habas-150.jpg',
        visible: false,
        estado: 'Inactivo',
        stock: 0,
      },
    ],
  },
];

// Catálogos de configuración del diseño (CATEGORIAS_BASE / PRESENTACIONES_CFG / UNIDADES_CFG).
const MOCK_CATEGORIAS: RegistroCfg[] = [
  {
    id: 1,
    nombre: 'Chifles',
    descripcion: 'Hojuelas de plátano bellaco en sus distintas variedades.',
    estado: 'Activo',
  },
  {
    id: 2,
    nombre: 'Camote',
    descripcion: 'Hojuelas de camote amarillo y morado.',
    estado: 'Activo',
  },
  {
    id: 3,
    nombre: 'Canchita y maíz',
    descripcion: 'Canchita, maíz chulpe y maíces tostados.',
    estado: 'Activo',
  },
  {
    id: 4,
    nombre: 'Maní y frutos secos',
    descripcion: 'Maní, pecanas y mezclas tostadas.',
    estado: 'Activo',
  },
  {
    id: 5,
    nombre: 'Habas y legumbres',
    descripcion: 'Habas, garbanzos y legumbres tostadas.',
    estado: 'Activo',
  },
  {
    id: 6,
    nombre: 'Mix y surtidos',
    descripcion: 'Combinaciones de snacks en un solo empaque.',
    estado: 'Activo',
  },
  {
    id: 7,
    nombre: 'Temporada',
    descripcion: 'Líneas estacionales de campaña.',
    estado: 'Inactivo',
  },
];

const MOCK_PRESENTACIONES: RegistroCfg[] = [
  { id: 1, nombre: 'Bolsa 100 g', descripcion: 'Bolsa sellada de 100 gramos.', estado: 'Activo' },
  { id: 2, nombre: 'Bolsa 120 g', descripcion: 'Bolsa sellada de 120 gramos.', estado: 'Activo' },
  { id: 3, nombre: 'Bolsa 150 g', descripcion: 'Bolsa sellada de 150 gramos.', estado: 'Activo' },
  { id: 4, nombre: 'Bolsa 180 g', descripcion: 'Bolsa sellada de 180 gramos.', estado: 'Activo' },
  { id: 5, nombre: 'Bolsa 200 g', descripcion: 'Bolsa sellada de 200 gramos.', estado: 'Activo' },
  { id: 6, nombre: 'Pack x6', descripcion: 'Pack de 6 bolsas.', estado: 'Activo' },
  { id: 7, nombre: 'Pack x12', descripcion: 'Pack de 12 bolsas.', estado: 'Activo' },
  {
    id: 8,
    nombre: 'Display x24',
    descripcion: 'Display de exhibición de 24 unidades.',
    estado: 'Inactivo',
  },
];

const MOCK_UNIDADES: UnidadCfg[] = [
  { id: 1, nombre: 'Unidad', abrev: 'unid', estado: 'Activo' },
  { id: 2, nombre: 'Caja', abrev: 'caja', estado: 'Activo' },
  { id: 3, nombre: 'Pack', abrev: 'pack', estado: 'Activo' },
  { id: 4, nombre: 'Bolsa', abrev: 'bol', estado: 'Activo' },
  { id: 5, nombre: 'Kilogramo', abrev: 'kg', estado: 'Activo' },
  { id: 6, nombre: 'Litro', abrev: 'L', estado: 'Activo' },
  { id: 7, nombre: 'Docena', abrev: 'doc', estado: 'Inactivo' },
];

const ETIQUETA: Record<CfgTab, string> = {
  categorias: 'Categoría',
  presentaciones: 'Presentación',
  unidades: 'Unidad de venta',
};

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  productos = signal<Producto[]>(MOCK_PRODUCTOS);
  categoriasCfg = signal<RegistroCfg[]>(MOCK_CATEGORIAS);
  presentacionesCfg = signal<RegistroCfg[]>(MOCK_PRESENTACIONES);
  unidadesCfg = signal<UnidadCfg[]>(MOCK_UNIDADES);

  filas = computed(() => aFilas(this.productos()));
  /** Nombres de categoría para el filtro del listado. */
  categorias = computed(() => this.categoriasCfg().map((c) => c.nombre));

  // ───────────── Productos ─────────────

  /** Devuelve el aviso a mostrar (mismo texto que el diseño). */
  registrar(pf: ProductoFormModel): string {
    const id = Math.max(0, ...this.productos().map((p) => p.id)) + 1;
    const presentaciones = pf.presentaciones.map((pr, i) => presentacionDesdeForm(pr, i + 1));
    const skus = presentaciones.map((pr) => skuDe(id, pr.id)).join(', ');
    this.productos.update((list) => [
      ...list,
      {
        id,
        nombre: pf.nombre,
        categoria: pf.categoria,
        descripcion: pf.descripcion,
        destacado: pf.destacado,
        presentaciones,
      },
    ]);
    return `Producto registrado · SKU ${skus} · producto terminado creado por presentación (cantidad 0, stock actual 0, stock mínimo 1, unidad ${UNIDAD}) · visible en Portal B inicia desactivado.`;
  }

  actualizar(id: number, pf: ProductoFormModel): string {
    this.productos.update((list) =>
      list.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              nombre: pf.nombre,
              categoria: pf.categoria,
              descripcion: pf.descripcion,
              destacado: pf.destacado,
              presentaciones: pf.presentaciones.map((pr, i) => presentacionDesdeForm(pr, i + 1)),
            },
      ),
    );
    return 'Producto actualizado · el SKU y el slug se mantienen sin cambios.';
  }

  /** "Desactivar" es lógico: alterna Activo/Inactivo de la presentación, sin borrarla. Devuelve el aviso. */
  alternarEstadoPresentacion(productoId: number, presentacionId: number): string {
    const sku = skuDe(productoId, presentacionId);
    const actual = this.productos()
      .find((p) => p.id === productoId)
      ?.presentaciones.find((pr) => pr.id === presentacionId)?.estado;
    this.productos.update((list) =>
      list.map((p) =>
        p.id !== productoId
          ? p
          : {
              ...p,
              presentaciones: p.presentaciones.map((pr) =>
                pr.id !== presentacionId
                  ? pr
                  : { ...pr, estado: pr.estado === 'Activo' ? 'Inactivo' : 'Activo' },
              ),
            },
      ),
    );
    return actual === 'Activo'
      ? `Presentación ${sku} desactivada de forma lógica.`
      : `Presentación ${sku} reactivada.`;
  }

  // ───────────── Configuración (categorías / presentaciones / unidades) ─────────────

  lista(tab: CfgTab): (RegistroCfg | UnidadCfg)[] {
    return tab === 'categorias'
      ? this.categoriasCfg()
      : tab === 'presentaciones'
        ? this.presentacionesCfg()
        : this.unidadesCfg();
  }

  /** Cantidad de productos/presentaciones que usan el registro (columna "Productos asociados"). */
  usosDe(tab: CfgTab, reg: RegistroCfg | UnidadCfg): number {
    const prods = this.productos();
    if (tab === 'categorias') {
      return prods
        .filter((p) => p.categoria === reg.nombre)
        .reduce((a, p) => a + p.presentaciones.length, 0);
    }
    if (tab === 'presentaciones') {
      return prods.reduce(
        (a, p) => a + p.presentaciones.filter((pr) => pr.nombre === reg.nombre).length,
        0,
      );
    }
    return (reg as UnidadCfg).abrev === UNIDAD
      ? prods.reduce((a, p) => a + p.presentaciones.length, 0)
      : 0;
  }

  validarCfg(tab: CfgTab, selId: number | null, cf: CfgFormModel): string[] {
    const e: string[] = [];
    if (!cf.nombre) e.push('nombre');
    if (tab === 'unidades') {
      if (!cf.abrev) e.push('abreviatura');
    } else if (!cf.descripcion) {
      e.push('descripción');
    }
    const dup = this.lista(tab).some(
      (x) => x.nombre.toLowerCase() === cf.nombre.toLowerCase() && x.id !== selId,
    );
    if (dup) e.push('el nombre ya está registrado');
    return e;
  }

  /** Alta (selId = null) o edición. Devuelve el aviso. Renombrar una categoría actualiza sus productos. */
  guardarCfg(tab: CfgTab, selId: number | null, cf: CfgFormModel): string {
    const etiqueta = ETIQUETA[tab];
    if (tab === 'unidades') {
      this.unidadesCfg.update((l) =>
        selId === null
          ? [
              ...l,
              {
                id: Math.max(0, ...l.map((x) => x.id)) + 1,
                nombre: cf.nombre,
                abrev: cf.abrev,
                estado: 'Activo',
              },
            ]
          : l.map((x) => (x.id === selId ? { ...x, nombre: cf.nombre, abrev: cf.abrev } : x)),
      );
    } else {
      const signalLista = tab === 'categorias' ? this.categoriasCfg : this.presentacionesCfg;
      if (tab === 'categorias' && selId !== null) {
        const anterior = signalLista().find((x) => x.id === selId)?.nombre;
        if (anterior && anterior !== cf.nombre) {
          this.productos.update((l) =>
            l.map((p) => (p.categoria === anterior ? { ...p, categoria: cf.nombre } : p)),
          );
        }
      }
      signalLista.update((l) =>
        selId === null
          ? [
              ...l,
              {
                id: Math.max(0, ...l.map((x) => x.id)) + 1,
                nombre: cf.nombre,
                descripcion: cf.descripcion,
                estado: 'Activo',
              },
            ]
          : l.map((x) =>
              x.id === selId ? { ...x, nombre: cf.nombre, descripcion: cf.descripcion } : x,
            ),
      );
    }
    return selId === null
      ? `${etiqueta} ${cf.nombre} registrada · disponible en los selectores de producto.`
      : `${etiqueta} ${cf.nombre} actualizada.`;
  }

  /** Desactivar/Reactivar es lógico: si hay productos asociados el registro nunca se elimina. */
  alternarCfg(tab: CfgTab, id: number): string {
    const etiqueta = ETIQUETA[tab];
    const reg = this.lista(tab).find((x) => x.id === id);
    if (!reg) return '';
    const nuevo = reg.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const aplicar = <T extends { id: number; estado: 'Activo' | 'Inactivo' }>(l: T[]): T[] =>
      l.map((x) => (x.id === id ? { ...x, estado: nuevo } : x));
    if (tab === 'categorias') this.categoriasCfg.update(aplicar);
    else if (tab === 'presentaciones') this.presentacionesCfg.update(aplicar);
    else this.unidadesCfg.update(aplicar);
    return reg.estado === 'Activo'
      ? `${etiqueta} ${reg.nombre} desactivada · ya no aparece en nuevos registros y se mantiene en los productos existentes.`
      : `${etiqueta} ${reg.nombre} reactivada.`;
  }
}
