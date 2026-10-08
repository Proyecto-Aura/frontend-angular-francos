import {
  AfterViewInit,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  LucideBan,
  LucideEye,
  LucideLayoutGrid,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideRotateCcw,
  LucideSearch,
  LucideTable,
} from '@lucide/angular';

import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import {
  Disponibilidad,
  FilaCatalogo,
  Producto,
  UNIDAD,
  disponibilidadDe,
  money,
  nf,
} from '../../interfaces/producto.interface';
import { AvisoBanner } from '../../components/aviso-banner/aviso-banner';
import { ProductoDetalle } from '../../components/producto-detalle/producto-detalle';
import { ProductoForm } from '../../components/producto-form/producto-form';
import { CatalogoService } from '../../services/catalogo.service';

const POR_PAGINA_TARJETAS = 12;
const POR_PAGINA_TABLA = 5;

type Vista = 'tarjetas' | 'tabla';
interface RowCtx {
  $implicit: FilaCatalogo;
  index: number;
}

@Component({
  imports: [
    AvisoBanner,
    Badge,
    Button,
    DataTable,
    FilterBar,
    Icon,
    IconButton,
    Input,
    Pagination,
    ProductoDetalle,
    ProductoForm,
    Select,
  ],
  selector: 'app-listar-catalogo',
  templateUrl: './listar-catalogo.html',
})
export class ListarCatalogo implements AfterViewInit {
  private catalogoService = inject(CatalogoService);

  @ViewChild('productoCell', { static: true }) productoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('precioCell', { static: true }) precioCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('destacadoCell', { static: true }) destacadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('promoCell', { static: true }) promoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('dispCell', { static: true }) dispCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  readonly LucideSearch = LucideSearch;
  readonly LucidePlus = LucidePlus;
  readonly LucideEye = LucideEye;
  readonly LucidePencil = LucidePencil;
  readonly LucidePackage = LucidePackage;
  readonly LucideLayoutGrid = LucideLayoutGrid;
  readonly LucideTable = LucideTable;
  readonly LucideBan = LucideBan;
  readonly LucideRotateCcw = LucideRotateCcw;

  protected readonly money = money;
  protected readonly nf = nf;
  protected readonly unidad = UNIDAD;

  // --- Filtros ---
  protected query = signal('');
  protected categoriaFiltro = signal('');
  protected presentacionFiltro = signal('');
  protected estadoFiltro = signal('');
  protected dispFiltro = signal('');
  protected vista = signal<Vista>('tarjetas');
  protected page = signal(1);

  protected readonly estadoOptions: SelectOption[] = [
    { value: 'Activo', label: 'Activo' },
    { value: 'Inactivo', label: 'Inactivo' },
  ];

  protected readonly dispOptions: SelectOption[] = [
    { value: 'disponible', label: 'Disponible' },
    { value: 'agotado', label: 'Agotado' },
  ];

  protected categoriaOptions = computed<SelectOption[]>(() =>
    this.catalogoService.categorias().map((c) => ({ value: c, label: c })),
  );

  protected presentacionOptions = computed<SelectOption[]>(() =>
    Array.from(new Set(this.catalogoService.filas().map((f) => f.presentacion))).map((p) => ({
      value: p,
      label: p,
    })),
  );

  protected filasFiltradas = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.categoriaFiltro();
    const pres = this.presentacionFiltro();
    const estado = this.estadoFiltro();
    const disp = this.dispFiltro();
    return this.catalogoService
      .filas()
      .filter(
        (f) =>
          (!q || f.nombre.toLowerCase().includes(q)) &&
          (!cat || f.categoria === cat) &&
          (!pres || f.presentacion === pres) &&
          (!estado || f.estado === estado) &&
          (!disp || (disp === 'disponible' ? f.stock > 0 : f.stock === 0)),
      );
  });

  protected pageSize = computed(() =>
    this.vista() === 'tarjetas' ? POR_PAGINA_TARJETAS : POR_PAGINA_TABLA,
  );
  protected pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filasFiltradas().length / this.pageSize())),
  );
  protected paginaActual = computed(() => Math.min(this.page(), this.pageCount()));

  protected filasPagina = computed(() => {
    const size = this.pageSize();
    const pagina = this.paginaActual();
    return this.filasFiltradas().slice((pagina - 1) * size, pagina * size);
  });

  protected columns = signal<DsColumn[]>([
    { key: 'producto', header: 'Producto' },
    { key: 'categoria', header: 'Categoría', muted: true },
    { key: 'presentacion', header: 'Presentación' },
    { key: 'precio', header: 'Precio unitario', width: '150px', align: 'right' },
    { key: 'destacado', header: 'Destacado', width: '138px' },
    { key: 'promo', header: 'Promoción', width: '124px' },
    { key: 'disp', header: 'Disponibilidad', width: '150px' },
    { key: 'estado', header: 'Estado', width: '120px' },
    { key: 'acciones', header: 'Acciones', width: '150px', align: 'right' },
  ]);

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        if (col.key === 'producto') return { ...col, cellTemplate: this.productoCellTpl };
        if (col.key === 'precio') return { ...col, cellTemplate: this.precioCellTpl };
        if (col.key === 'destacado') return { ...col, cellTemplate: this.destacadoCellTpl };
        if (col.key === 'promo') return { ...col, cellTemplate: this.promoCellTpl };
        if (col.key === 'disp') return { ...col, cellTemplate: this.dispCellTpl };
        if (col.key === 'estado') return { ...col, cellTemplate: this.estadoCellTpl };
        if (col.key === 'acciones') return { ...col, cellTemplate: this.accionesCellTpl };
        return col;
      }),
    );
  }

  // Cada cambio de filtro o de vista vuelve a la página 1 (igual que el diseño).
  protected setQuery(v: string) {
    this.query.set(v);
    this.page.set(1);
  }
  protected setCategoria(v: string) {
    this.categoriaFiltro.set(v);
    this.page.set(1);
  }
  protected setPresentacion(v: string) {
    this.presentacionFiltro.set(v);
    this.page.set(1);
  }
  protected setEstado(v: string) {
    this.estadoFiltro.set(v);
    this.page.set(1);
  }
  protected setDisp(v: string) {
    this.dispFiltro.set(v);
    this.page.set(1);
  }
  protected setVista(v: Vista) {
    this.vista.set(v);
    this.page.set(1);
  }

  protected dispDe(f: FilaCatalogo): Disponibilidad {
    return disponibilidadDe(f);
  }

  protected dispTone(f: FilaCatalogo): BadgeTone {
    const d = disponibilidadDe(f);
    return d === 'disponible' ? 'success' : d === 'bajo' ? 'warning' : 'danger';
  }

  protected dispLabel(f: FilaCatalogo): string {
    const d = disponibilidadDe(f);
    return d === 'disponible' ? 'Disponible' : d === 'bajo' ? 'Stock bajo' : 'Agotado';
  }

  protected dispTexto(f: FilaCatalogo): string {
    if (f.stock === 0) return 'Agotado';
    return f.stock < f.umbral
      ? `${nf(f.stock)} ${UNIDAD} · bajo el umbral mayorista`
      : `${nf(f.stock)} ${UNIDAD} disponibles`;
  }

  protected estadoTone(estado: FilaCatalogo['estado']): BadgeTone {
    return estado === 'Activo' ? 'success' : 'neutral';
  }

  // --- Formulario (registrar / editar) y detalle ---
  protected formModo = signal<'nuevo' | 'editar' | null>(null);
  protected productoEnEdicion = signal<Producto | null>(null);
  protected skuDetalle = signal<string | null>(null);
  protected aviso = signal('');

  /** El detalle se resuelve por SKU para reflejar cambios (p. ej. al desactivar desde el propio modal). */
  protected filaDetalle = computed(() => {
    const sku = this.skuDetalle();
    return sku ? (this.catalogoService.filas().find((f) => f.sku === sku) ?? null) : null;
  });

  protected nuevoProducto() {
    this.productoEnEdicion.set(null);
    this.formModo.set('nuevo');
  }

  protected editarProducto(f: FilaCatalogo) {
    this.skuDetalle.set(null);
    this.productoEnEdicion.set(
      this.catalogoService.productos().find((p) => p.id === f.productoId) ?? null,
    );
    this.formModo.set('editar');
  }

  protected cerrarForm() {
    this.formModo.set(null);
    this.productoEnEdicion.set(null);
  }

  protected verProducto(f: FilaCatalogo) {
    this.skuDetalle.set(f.sku);
  }

  protected mostrarAviso(texto: string) {
    this.aviso.set(texto);
  }

  /** Desactivar/Reactivar presentación: lógico, sin confirmación (así lo define el diseño). */
  protected alternarEstado(f: FilaCatalogo) {
    this.aviso.set(this.catalogoService.alternarEstadoPresentacion(f.productoId, f.presentacionId));
  }
}
