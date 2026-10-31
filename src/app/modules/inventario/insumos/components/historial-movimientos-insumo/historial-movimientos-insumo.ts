import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  Type,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowDownLeft,
  LucideArrowLeftRight,
  LucideArrowUpRight,
  LucideSearch,
  LucideEye,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import {
  MovimientoInsumo,
  TipoMovimientoInsumoHistorial,
} from '../../interfaces/movimiento-insumo.interface';
import { MovimientoInsumoService } from '../../services/movimiento-insumo.service';

const SIN_DATO = '—';

const TIPO_LABEL: Record<TipoMovimientoInsumoHistorial, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
};

const TIPO_TONE: Record<TipoMovimientoInsumoHistorial, BadgeTone> = {
  entrada: 'success',
  salida: 'info',
  ajuste: 'warning',
};

const TIPO_ICON: Record<TipoMovimientoInsumoHistorial, Type<unknown>> = {
  entrada: LucideArrowDownLeft,
  salida: LucideArrowUpRight,
  ajuste: LucideArrowLeftRight,
};

// Duplica a proposito los fg de BadgeTone (badge.ts no los expone) — mismo
// criterio que insumo-detalle-modal.ts, es el color del texto de la celda
// "Cantidad", que no usa <app-ds-badge> (va sin fondo, solo texto en color).
const TONE_FG: Record<BadgeTone, string> = {
  neutral: '#5C5C5C',
  brand: '#D22B2B',
  success: '#2E7D32',
  warning: '#B35D00',
  danger: '#C62828',
  info: '#1565C0',
};

interface FilaMovimientoGeneral {
  codigoLote: string;
  cantidadLoteMostrada: string;
  codigo: string;
  fechaMostrada: string;
  horaMostrada: string;
  insumoNombre: string;
  insumoSku: string;
  tipo: TipoMovimientoInsumoHistorial;
  cantidad: number;
  cantidadMostrada: string;
  stockAnteriorMostrado: string;
  stockResultanteMostrado: string;
  razon: string;
}

// Tabla general de "Historial de movimientos": junta los movimientos de
// TODOS los insumos (a diferencia de la pestaña homonima dentro del modal
// de detalle de un insumo, que ya viene acotada a uno solo). Autonoma — se
// carga sola apenas Angular la instancia, que con @if en stock-insumos.html
// pasa recien cuando se entra a esta pestaña (lazy de fabrica).
@Component({
  imports: [
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    FilterBar,
    Icon,
    Input,
    Pagination,
    Select,
    IconButton,
    Modal,
  ],
  selector: 'app-historial-movimientos-insumo',
  templateUrl: './historial-movimientos-insumo.html',
})
export class HistorialMovimientosInsumo implements OnInit, AfterViewInit {
  private movimientoService = inject(MovimientoInsumoService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('fechaCell', { static: true })
  fechaCellTpl!: TemplateRef<{ $implicit: FilaMovimientoGeneral; index: number }>;

  @ViewChild('insumoCell', { static: true })
  insumoCellTpl!: TemplateRef<{ $implicit: FilaMovimientoGeneral; index: number }>;

  @ViewChild('tipoCell', { static: true })
  tipoCellTpl!: TemplateRef<{ $implicit: FilaMovimientoGeneral; index: number }>;

  @ViewChild('cantidadCell', { static: true })
  cantidadCellTpl!: TemplateRef<{ $implicit: FilaMovimientoGeneral; index: number }>;

  readonly LucideSearch = LucideSearch;
  readonly LucideEye = LucideEye;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: FilaMovimientoGeneral; index: number }>;

  movimientoDetalle = signal<FilaMovimientoGeneral | null>(null);
  camposDetalle = computed(() => {
    const m = this.movimientoDetalle();
    return m
      ? [
          { label: 'Código', value: m.codigo },
          { label: 'Fecha y hora', value: `${m.fechaMostrada} · ${m.horaMostrada}` },
          { label: 'Insumo', value: m.insumoNombre },
          { label: 'SKU', value: m.insumoSku },
          { label: 'Tipo de movimiento', value: this.tipoLabel(m.tipo) },
          { label: 'Cantidad', value: m.cantidadMostrada },
          { label: 'Stock anterior', value: m.stockAnteriorMostrado },
          { label: 'Stock resultante', value: m.stockResultanteMostrado },
          { label: 'Motivo', value: m.razon },
        ]
      : [];
  });
  readonly columnasLote: DsColumn[] = [
    { key: 'codigoLote', header: 'Lote afectado', strong: true },
    { key: 'cantidadLoteMostrada', header: 'Cantidad del movimiento', numeric: true },
  ];

  verDetalle(fila: FilaMovimientoGeneral): void {
    this.movimientoDetalle.set(fila);
  }

  cerrarDetalle(): void {
    this.movimientoDetalle.set(null);
  }

  readonly tamanioPagina = 10;

  readonly tipoOptions: SelectOption[] = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' },
    { value: 'ajuste', label: 'Ajuste' },
  ];

  // --- Filtros (van contra el backend: search/tipo/fecha_desde/fecha_hasta
  // son query params reales de GET /movimientos-insumo).
  search = signal('');
  tipoFiltro = signal('');
  fechaDesde = signal('');
  fechaHasta = signal('');

  // Un rango invertido no se envia: el backend lo rechazaria con 400.
  rangoInvalido = computed(() => {
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    return Boolean(desde && hasta && desde > hasta);
  });

  columnas = signal<DsColumn[]>([]);
  movimientos = signal<FilaMovimientoGeneral[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigo', header: 'Código', strong: true },
      { key: 'fechaMostrada', header: 'Fecha y hora', cellTemplate: this.fechaCellTpl },
      { key: 'insumoNombre', header: 'Insumo', cellTemplate: this.insumoCellTpl },
      { key: 'tipo', header: 'Tipo', cellTemplate: this.tipoCellTpl },
      {
        key: 'cantidadMostrada',
        header: 'Cantidad',
        cellTemplate: this.cantidadCellTpl,
        numeric: true,
      },
      { key: 'stockAnteriorMostrado', header: 'Stock anterior', numeric: true, muted: true },
      { key: 'stockResultanteMostrado', header: 'Stock resultante', numeric: true },
      { key: 'acciones', header: 'Acciones', align: 'right', cellTemplate: this.accionesCellTpl },
    ]);
  }

  cargarMovimientos(pagina = this.pagina()): void {
    if (this.rangoInvalido()) return;

    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.movimientoService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        tipo: (this.tipoFiltro() as TipoMovimientoInsumoHistorial) || undefined,
        fechaDesde: this.fechaDesde() || undefined,
        fechaHasta: this.fechaHasta() || undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.movimientos.set(pagina.movimientos.map((m) => this.aFila(m)));
          this.pagina.set(pagina.pagina);
          this.total.set(pagina.total);
          this.totalPaginas.set(pagina.totalPaginas);
        },
        error: () => {
          this.movimientos.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  setSearch(valor: string): void {
    this.search.set(valor);
    this.cargarMovimientos(1);
  }

  setTipo(valor: string): void {
    this.tipoFiltro.set(valor);
    this.cargarMovimientos(1);
  }

  setFechaDesde(valor: string): void {
    this.fechaDesde.set(valor);
    this.cargarMovimientos(1);
  }

  setFechaHasta(valor: string): void {
    this.fechaHasta.set(valor);
    this.cargarMovimientos(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarMovimientos(pagina);
    }
  }

  tipoLabel(tipo: TipoMovimientoInsumoHistorial): string {
    return TIPO_LABEL[tipo];
  }

  tipoTone(tipo: TipoMovimientoInsumoHistorial): BadgeTone {
    return TIPO_TONE[tipo];
  }

  tipoIcon(tipo: TipoMovimientoInsumoHistorial): Type<unknown> {
    return TIPO_ICON[tipo];
  }

  cantidadColor(fila: FilaMovimientoGeneral): string {
    if (fila.tipo === 'ajuste') return TONE_FG[fila.cantidad >= 0 ? 'success' : 'danger'];
    return TONE_FG[this.tipoTone(fila.tipo)];
  }

  private aFila(m: MovimientoInsumo): FilaMovimientoGeneral {
    const cantidad =
      m.tipo === 'ajuste' ? m.cantidad : m.tipo === 'salida' ? -m.cantidad : m.cantidad;
    const { fecha, hora } = this.formatearFechaHora(m.fecha);
    return {
      codigoLote: m.codigoLote || SIN_DATO,
      cantidadLoteMostrada: `${Math.abs(m.cantidad)} ${m.insumoUnidadMedida}`,
      codigo: m.codigo,
      fechaMostrada: fecha,
      horaMostrada: hora,
      insumoNombre: m.insumoNombre,
      insumoSku: m.insumoSku,
      tipo: m.tipo,
      cantidad,
      cantidadMostrada: `${cantidad > 0 ? '+' : ''}${cantidad} ${m.insumoUnidadMedida}`,
      stockAnteriorMostrado: `${m.stockAnterior} ${m.insumoUnidadMedida}`,
      stockResultanteMostrado: `${m.stockResultante} ${m.insumoUnidadMedida}`,
      razon: m.razon || SIN_DATO,
    };
  }

  // "fecha" es un timestamptz real con hora — se deja que Date lo parsee tal
  // cual (sin el truco de slice(0,10) que usan las fechas "puras"
  // YYYY-MM-DD en otros lados), para que la hora salga en la zona local.
  private formatearFechaHora(fechaIso: string): { fecha: string; hora: string } {
    const fecha = new Date(fechaIso);
    return {
      fecha: new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(fecha),
      hora: new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(fecha),
    };
  }
}
