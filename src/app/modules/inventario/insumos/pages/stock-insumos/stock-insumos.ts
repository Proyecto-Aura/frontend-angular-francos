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
  LucideLayers,
  LucidePackage,
  LucidePencil,
  LucidePlus,
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
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { HistorialMovimientosInsumo } from '../../components/historial-movimientos-insumo/historial-movimientos-insumo';
import { InsumoDetalleModal } from '../../components/insumo-detalle-modal/insumo-detalle-modal';
import { InsumoFormModal } from '../../components/insumo-form-modal/insumo-form-modal';
import { LoteFormModal } from '../../components/lote-form-modal/lote-form-modal';
import { LotesInsumoGeneral } from '../../components/lotes-insumo-general/lotes-insumo-general';
import { MovimientoFormModal } from '../../components/movimiento-form-modal/movimiento-form-modal';
import {
  Insumo,
  NivelStock,
  ResumenInsumos,
  TipoInsumo,
  calcularNivelStock,
} from '../../interfaces/insumo.interface';
import { InsumoService } from '../../services/insumo.service';
import { LoteInsumoService } from '../../services/lote-insumo.service';

const RESUMEN_VACIO: ResumenInsumos = { total: 0, normal: 0, alto: 0, bajo: 0, agotados: 0 };

// KPIs + tabs Stock/Historial + filtros + tabla, reutilizando el design
// system tal cual lo usa plan-estrategico-home.ts. Los botones de accion
// quedan dentro del contenido del tab "Stock" (no en el header de la
// pagina) porque no aplican al tab "Historial de movimientos".
//
// El tab "Historial de movimientos" delega todo en HistorialMovimientosInsumo
// (autonomo, carga sus propios datos) — distinto de la pestaña homonima
// dentro de InsumoDetalleModal, que ya viene acotada a un solo insumo.
//
// "Registrar movimiento" abre MovimientoFormModal, conectado a
// POST /movimientos-insumo/entrada|salida|ajuste (batch transaccional, todo
// o nada).
const TIPO_LABEL: Record<TipoInsumo, string> = {
  materia_prima: 'Materia prima',
  empaque: 'Empaque',
};

const NIVEL_LABEL: Record<NivelStock, string> = {
  normal: 'Normal',
  alto: 'Stock alto',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

const NIVEL_TONE: Record<NivelStock, BadgeTone> = {
  normal: 'success',
  alto: 'info',
  bajo: 'warning',
  agotado: 'danger',
};

@Component({
  imports: [
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    FilterBar,
    HistorialMovimientosInsumo,
    Icon,
    IconButton,
    Input,
    InsumoDetalleModal,
    InsumoFormModal,
    KpiCard,
    LoteFormModal,
    LotesInsumoGeneral,
    MovimientoFormModal,
    Pagination,
    Select,
    Tabs,
  ],
  selector: 'app-stock-insumos',
  templateUrl: './stock-insumos.html',
})
export class StockInsumos implements OnInit, AfterViewInit {
  private insumoService = inject(InsumoService);
  private loteService = inject(LoteInsumoService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('insumoCell', { static: true })
  insumoCellTpl!: TemplateRef<{ $implicit: Insumo; index: number }>;

  @ViewChild('tipoCell', { static: true })
  tipoCellTpl!: TemplateRef<{ $implicit: Insumo; index: number }>;

  @ViewChild('nivelCell', { static: true })
  nivelCellTpl!: TemplateRef<{ $implicit: Insumo; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: Insumo; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: Insumo; index: number }>;

  readonly LucideArrowLeftRight = LucideArrowLeftRight;
  readonly LucideBan = LucideBan;
  readonly LucideCircleAlert = LucideCircleAlert;
  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideEye = LucideEye;
  readonly LucideLayers = LucideLayers;
  readonly LucidePackage = LucidePackage;
  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;
  readonly LucideRotateCcw = LucideRotateCcw;
  readonly LucideSearch = LucideSearch;
  readonly LucideTrendingDown = LucideTrendingDown;
  readonly LucideTrendingUp = LucideTrendingUp;

  readonly tamanioPagina = 10;

  readonly tipoOptions: SelectOption[] = [
    { value: 'materia_prima', label: 'Materia prima' },
    { value: 'empaque', label: 'Empaque' },
  ];

  // El <select> del HTML solo puede manejar strings — el valor 'true'/'false'
  // se convierte a boolean real en cargarInsumos() antes de llamar al
  // servicio (el backend exige el booleano literal, no el label).
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

  activeTab = signal<'stock' | 'historial' | 'lotes'>('stock');
  columnas = signal<DsColumn[]>([]);

  // --- Filtros (van contra el backend: search/estado/tipo/nivel son query
  // params reales de GET /insumos). "nivel" lo calcula el backend con el
  // mismo criterio que /insumos/indicadores (confirmado por el backend) —
  // asi la paginacion sigue siendo la del servidor, sin traer todo el
  // catalogo para filtrar por nivel en el front.
  search = signal('');
  tipoFiltro = signal('');
  estadoFiltro = signal('');
  nivelFiltro = signal('');

  insumos = signal<Insumo[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  // Conteos de /insumos/indicadores — solo insumos activos, calculados por
  // el backend con el mismo criterio que calcularNivelStock() de abajo.
  resumen = signal<ResumenInsumos>(RESUMEN_VACIO);

  // Solo para el contador de la pestaña "Lotes" — se pide aparte (limit=1,
  // solo interesa meta.total) porque LotesInsumoGeneral es autonomo (carga
  // sus propios datos, igual que HistorialMovimientosInsumo) y no expone su
  // total hacia este componente.
  lotesTotal = signal(0);

  modalFormAbierto = signal(false);
  insumoEnEdicion = signal<Insumo | null>(null);
  insumoEnDetalle = signal<Insumo | null>(null);
  modalLoteAbierto = signal(false);
  modalMovimientoAbierto = signal(false);
  // Insumo de origen cuando se abre desde el icono "Registrar movimiento" de
  // una fila (null = se abrio desde el boton general, sin preseleccion).
  insumoParaMovimiento = signal<Insumo | null>(null);

  tabs = computed<DsTab[]>(() => [
    { id: 'stock', label: 'Stock', icon: LucidePackage, count: this.resumen().total },
    { id: 'historial', label: 'Historial de movimientos', icon: LucideClock, count: 0 },
    { id: 'lotes', label: 'Lotes', icon: LucideLayers, count: this.lotesTotal() },
  ]);

  ngOnInit(): void {
    this.cargarInsumos();
    this.cargarResumen();
    this.cargarLotesTotal();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'nombre', header: 'Insumo', cellTemplate: this.insumoCellTpl },
      { key: 'tipo', header: 'Tipo', muted: true, cellTemplate: this.tipoCellTpl },
      { key: 'unidadMedida', header: 'Unidad', muted: true },
      { key: 'stockActual', header: 'Stock actual', numeric: true },
      { key: 'stockMinimo', header: 'Stock min.', numeric: true, muted: true },
      { key: 'stockMaximo', header: 'Stock máx.', numeric: true, muted: true },
      { key: 'nivel', header: 'Nivel', cellTemplate: this.nivelCellTpl },
      { key: 'estado', header: 'Estado', cellTemplate: this.estadoCellTpl },
      { key: 'acciones', header: 'Acciones', align: 'right', cellTemplate: this.accionesCellTpl },
    ]);
  }

  cargarInsumos(pagina = this.pagina()): void {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.insumoService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        estado: this.estadoFiltro() === '' ? undefined : this.estadoFiltro() === 'true',
        tipo: this.tipoFiltro() || undefined,
        nivel: (this.nivelFiltro() as NivelStock) || undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.insumos.set(resultado.insumos);
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.insumos.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  cargarResumen(): void {
    this.insumoService
      .indicadores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => this.resumen.set(resumen),
        error: () => this.resumen.set(RESUMEN_VACIO),
      });
  }

  cargarLotesTotal(): void {
    this.loteService
      .listar(1, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.lotesTotal.set(pagina.total),
        error: () => this.lotesTotal.set(0),
      });
  }

  recargarTodo(): void {
    this.cargarInsumos(this.pagina());
    this.cargarResumen();
  }

  setSearch(valor: string): void {
    this.search.set(valor);
    this.cargarInsumos(1);
  }

  setTipo(valor: string): void {
    this.tipoFiltro.set(valor);
    this.cargarInsumos(1);
  }

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarInsumos(1);
  }

  setNivel(valor: string): void {
    this.nivelFiltro.set(valor);
    this.cargarInsumos(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarInsumos(pagina);
    }
  }

  cambiarTab(id: string): void {
    if (id === 'historial' || id === 'lotes') {
      this.activeTab.set(id);
      return;
    }
    this.activeTab.set('stock');
  }

  abrirNuevoInsumo(): void {
    this.insumoEnEdicion.set(null);
    this.modalFormAbierto.set(true);
  }

  abrirEditarInsumo(insumo: Insumo): void {
    this.insumoEnEdicion.set(insumo);
    this.modalFormAbierto.set(true);
  }

  cerrarFormInsumo(): void {
    this.modalFormAbierto.set(false);
    this.insumoEnEdicion.set(null);
  }

  insumoGuardado(): void {
    this.cerrarFormInsumo();
    this.recargarTodo();
  }

  abrirRegistrarLote(): void {
    this.modalLoteAbierto.set(true);
  }

  cerrarFormLote(): void {
    this.modalLoteAbierto.set(false);
  }

  loteGuardado(): void {
    this.cerrarFormLote();
    this.recargarTodo();
  }

  abrirRegistrarMovimiento(insumo: Insumo | null = null): void {
    this.insumoParaMovimiento.set(insumo);
    this.modalMovimientoAbierto.set(true);
  }

  cerrarFormMovimiento(): void {
    this.modalMovimientoAbierto.set(false);
    this.insumoParaMovimiento.set(null);
  }

  movimientoGuardado(): void {
    this.cerrarFormMovimiento();
    this.recargarTodo();
  }

  /** Activar/desactivar: logico (toggle de estado), sin confirmacion — mismo criterio que catalogo. */
  alternarEstado(insumo: Insumo): void {
    if (insumo.estado) {
      this.insumoService
        .desactivar(insumo.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.recargarTodo());
      return;
    }

    this.insumoService
      .activar(insumo.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recargarTodo());
  }

  nivel(insumo: Insumo): NivelStock {
    return calcularNivelStock(insumo);
  }

  nivelLabel(insumo: Insumo): string {
    return NIVEL_LABEL[this.nivel(insumo)];
  }

  nivelTone(insumo: Insumo): BadgeTone {
    return NIVEL_TONE[this.nivel(insumo)];
  }

  tipoLabel(insumo: Insumo): string {
    return TIPO_LABEL[insumo.tipo];
  }
}
