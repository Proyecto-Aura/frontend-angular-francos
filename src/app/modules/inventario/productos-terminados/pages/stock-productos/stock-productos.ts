import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowLeftRight,
  LucideBan,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideClock,
  LucideEye,
  LucidePackage,
  LucidePencil,
  LucideRotateCcw,
  LucideSearch,
  LucideTrendingDown,
  LucideTrendingUp,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { EditarStockModal } from '../../components/editar-stock-modal/editar-stock-modal';
import { ProductoDetalleModal } from '../../components/producto-detalle-modal/producto-detalle-modal';
import {
  NivelStockProducto,
  ProductoPresentacion,
  ResumenProductosTerminados,
  calcularNivelStockProducto,
} from '../../interfaces/producto-presentacion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';

const RESUMEN_VACIO: ResumenProductosTerminados = {
  total: 0,
  normal: 0,
  alto: 0,
  bajo: 0,
  agotados: 0,
};

const NIVEL_LABEL: Record<NivelStockProducto, string> = {
  normal: 'Normal',
  alto: 'Stock alto',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

const NIVEL_TONE: Record<NivelStockProducto, BadgeTone> = {
  normal: 'success',
  alto: 'info',
  bajo: 'warning',
  agotado: 'danger',
};

// "Stock de productos": KPIs + tabs Stock/Historial + filtros + tabla,
// mismo patron que stock-insumos.ts. "Registrar movimiento" abre un modal
// placeholder — el backend de movimientos de producto (entrada/salida/
// ajuste, FEFO) todavia no existe (confirmado por el backend, es otra
// historia) — y "Historial de movimientos" queda igual como placeholder,
// igual que arranco insumos antes de que existiera /movimientos-insumo. A
// diferencia de insumos, no hay "Registrar lote" (producto terminado no
// maneja lotes, confirmado con el usuario).
@Component({
  imports: [
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    EditarStockModal,
    FilterBar,
    Icon,
    IconButton,
    Input,
    KpiCard,
    Modal,
    Pagination,
    ProductoDetalleModal,
    Select,
    Tabs,
  ],
  selector: 'app-stock-productos',
  templateUrl: './stock-productos.html',
})
export class StockProductos implements OnInit, AfterViewInit {
  private productoPresentacionService = inject(ProductoPresentacionService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaProducto; index: number }>;

  @ViewChild('nivelCell', { static: true })
  nivelCellTpl!: TemplateRef<{ $implicit: FilaProducto; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: FilaProducto; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: FilaProducto; index: number }>;

  readonly LucideArrowLeftRight = LucideArrowLeftRight;
  readonly LucideSearch = LucideSearch;
  readonly LucidePackage = LucidePackage;
  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideTrendingUp = LucideTrendingUp;
  readonly LucideTrendingDown = LucideTrendingDown;
  readonly LucideCircleAlert = LucideCircleAlert;
  readonly LucideEye = LucideEye;
  readonly LucidePencil = LucidePencil;
  readonly LucideBan = LucideBan;
  readonly LucideRotateCcw = LucideRotateCcw;

  readonly tamanioPagina = 10;

  activeTab = signal<'stock' | 'historial'>('stock');
  modalMovimientoAbierto = signal(false);
  productoEnDetalle = signal<ProductoPresentacion | null>(null);
  productoEnEdicion = signal<ProductoPresentacion | null>(null);

  tabs = computed<DsTab[]>(() => [
    { id: 'stock', label: 'Stock', icon: LucidePackage, count: this.resumen().total },
    { id: 'historial', label: 'Historial de movimientos', icon: LucideClock, count: 0 },
  ]);

  readonly estadoOptions: SelectOption[] = [
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' },
  ];

  readonly nivelOptions: SelectOption[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'alto', label: 'Stock alto' },
    { value: 'bajo', label: 'Stock bajo' },
    { value: 'agotado', label: 'Agotado' },
  ];

  categoriaOptions = signal<SelectOption[]>([]);
  presentacionOptions = signal<SelectOption[]>([]);

  // --- Filtros (van contra el backend: search/estado/categoria/presentacion/
  // nivel son query params reales de GET /producto-presentaciones).
  search = signal('');
  categoriaFiltro = signal('');
  presentacionFiltro = signal('');
  nivelFiltro = signal('');
  estadoFiltro = signal('');

  columnas = signal<DsColumn[]>([]);
  productos = signal<FilaProducto[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  resumen = signal<ResumenProductosTerminados>(RESUMEN_VACIO);

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarResumen();
    this.cargarCategorias();
    this.cargarPresentaciones();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'productoNombre', header: 'Producto', cellTemplate: this.productoCellTpl },
      { key: 'categoriaNombre', header: 'Categoría', muted: true },
      { key: 'presentacionMostrada', header: 'Presentación', muted: true },
      { key: 'stockActual', header: 'Stock actual', numeric: true },
      { key: 'stockMinimo', header: 'Stock mín.', numeric: true, muted: true },
      { key: 'stockMaximoMostrado', header: 'Stock máx.', numeric: true, muted: true },
      { key: 'nivel', header: 'Nivel', cellTemplate: this.nivelCellTpl },
      { key: 'estado', header: 'Estado', cellTemplate: this.estadoCellTpl },
      { key: 'acciones', header: 'Acciones', align: 'right', cellTemplate: this.accionesCellTpl },
    ]);
  }

  cargarProductos(pagina = this.pagina()): void {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.productoPresentacionService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        estado: this.estadoFiltro() === '' ? undefined : this.estadoFiltro() === 'true',
        categoriaId: this.categoriaFiltro() ? Number(this.categoriaFiltro()) : undefined,
        presentacionId: this.presentacionFiltro() ? Number(this.presentacionFiltro()) : undefined,
        nivel: (this.nivelFiltro() as NivelStockProducto) || undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.productos.set(resultado.productos.map((p) => this.aFila(p)));
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.productos.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  cargarResumen(): void {
    this.productoPresentacionService
      .indicadores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => this.resumen.set(resumen),
        error: () => this.resumen.set(RESUMEN_VACIO),
      });
  }

  recargarTodo(): void {
    this.cargarProductos(this.pagina());
    this.cargarResumen();
  }

  setSearch(valor: string): void {
    this.search.set(valor);
    this.cargarProductos(1);
  }

  setCategoria(valor: string): void {
    this.categoriaFiltro.set(valor);
    this.cargarProductos(1);
  }

  setPresentacion(valor: string): void {
    this.presentacionFiltro.set(valor);
    this.cargarProductos(1);
  }

  setNivel(valor: string): void {
    this.nivelFiltro.set(valor);
    this.cargarProductos(1);
  }

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarProductos(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarProductos(pagina);
    }
  }

  cambiarTab(id: string): void {
    this.activeTab.set(id === 'historial' ? 'historial' : 'stock');
  }

  abrirRegistrarMovimiento(): void {
    this.modalMovimientoAbierto.set(true);
  }

  cerrarRegistrarMovimiento(): void {
    this.modalMovimientoAbierto.set(false);
  }

  abrirEditar(producto: ProductoPresentacion): void {
    this.productoEnEdicion.set(producto);
  }

  cerrarEditar(): void {
    this.productoEnEdicion.set(null);
  }

  productoEditado(): void {
    this.cerrarEditar();
    this.recargarTodo();
  }

  /** Activar/desactivar: logico (toggle de estado), sin confirmacion — mismo criterio que insumos. */
  alternarEstado(producto: ProductoPresentacion): void {
    if (producto.estado) {
      this.productoPresentacionService
        .desactivar(producto.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.recargarTodo());
      return;
    }

    this.productoPresentacionService
      .activar(producto.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recargarTodo());
  }

  nivelLabel(nivel: NivelStockProducto): string {
    return NIVEL_LABEL[nivel];
  }

  nivelTone(nivel: NivelStockProducto): BadgeTone {
    return NIVEL_TONE[nivel];
  }

  private cargarCategorias(): void {
    this.productoPresentacionService
      .listarCategorias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opciones) =>
          this.categoriaOptions.set(
            opciones.map((o) => ({ value: String(o.id), label: o.nombre })),
          ),
        error: () => this.categoriaOptions.set([]),
      });
  }

  private cargarPresentaciones(): void {
    this.productoPresentacionService
      .listarPresentaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opciones) =>
          this.presentacionOptions.set(
            opciones.map((o) => ({
              value: String(o.id),
              label: etiquetaPresentacion(o.cantidad, o.unidadMedida),
            })),
          ),
        error: () => this.presentacionOptions.set([]),
      });
  }

  private aFila(p: ProductoPresentacion): FilaProducto {
    return {
      producto: p,
      productoNombre: p.productoNombre,
      sku: p.sku,
      categoriaNombre: p.categoriaNombre,
      presentacionMostrada: etiquetaPresentacion(
        p.presentacionCantidad,
        p.presentacionUnidadMedida,
      ),
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      stockMaximoMostrado: p.stockMaximo ?? '—',
      nivel: calcularNivelStockProducto(p),
      estado: p.estado,
    };
  }
}

interface FilaProducto {
  // El objeto original, para las acciones de fila (editar, activar/desactivar).
  producto: ProductoPresentacion;
  productoNombre: string;
  sku: string;
  categoriaNombre: string;
  presentacionMostrada: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximoMostrado: number | string;
  nivel: NivelStockProducto;
  estado: boolean;
}
