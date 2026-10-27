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
import { LucideSearch } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Insumo } from '../../interfaces/insumo.interface';
import { EstadoLote, LoteInsumo } from '../../interfaces/lote-insumo.interface';
import { InsumoService } from '../../services/insumo.service';
import { LoteInsumoService } from '../../services/lote-insumo.service';

const SIN_DATO = '—';

const ESTADO_LABEL: Record<EstadoLote, string> = {
  activo: 'Activo',
  por_vencer: 'Por vencer',
  agotado: 'Agotado',
  vencido: 'Vencido',
};

const ESTADO_TONE: Record<EstadoLote, BadgeTone> = {
  activo: 'success',
  por_vencer: 'warning',
  agotado: 'neutral',
  vencido: 'danger',
};

interface FilaLoteGeneral {
  codigoLote: string;
  insumoNombre: string;
  insumoSku: string;
  fechaIngresoMostrada: string;
  fechaVencimientoMostrada: string;
  // null = sin fecha, o el lote no esta clasificado como "por_vencer" por
  // el backend (el badge "Vence en N dias" solo aplica a ese estado).
  diasParaVencer: number | null;
  cantidadInicialMostrada: string;
  cantidadActualMostrada: string;
  estado: EstadoLote;
}

// Vista general de "Lotes": junta los lotes de TODOS los insumos (a
// diferencia de la pestaña homonima dentro de InsumoDetalleModal, que ya
// viene acotada a uno solo) — mismo patron autonomo que
// HistorialMovimientosInsumo. GET /lotes-insumo no trae nombre/SKU del
// insumo embebido (solo insumo_id), asi que se resuelve con un catalogo de
// insumos cargado aparte y unido via un computed() — evita una condicion de
// carrera si esa carga termina despues que la de lotes.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, FilterBar, Icon, Input, Pagination, Select],
  selector: 'app-lotes-insumo-general',
  templateUrl: './lotes-insumo-general.html',
})
export class LotesInsumoGeneral implements OnInit, AfterViewInit {
  private loteService = inject(LoteInsumoService);
  private insumoService = inject(InsumoService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('insumoCell', { static: true })
  insumoCellTpl!: TemplateRef<{ $implicit: FilaLoteGeneral; index: number }>;

  @ViewChild('vencimientoCell', { static: true })
  vencimientoCellTpl!: TemplateRef<{ $implicit: FilaLoteGeneral; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: FilaLoteGeneral; index: number }>;

  readonly LucideSearch = LucideSearch;

  readonly tamanioPagina = 10;

  readonly estadoOptions: SelectOption[] = [
    { value: 'activo', label: 'Activo' },
    { value: 'por_vencer', label: 'Por vencer' },
    { value: 'agotado', label: 'Agotado' },
    { value: 'vencido', label: 'Vencido' },
  ];

  // --- Filtros (van contra el backend: search/insumo_id/estado/
  // vence_desde/vence_hasta son query params reales de GET /lotes-insumo).
  search = signal('');
  insumoFiltro = signal('');
  estadoFiltro = signal('');
  venceDesde = signal('');
  venceHasta = signal('');

  hayFiltros = computed(() =>
    Boolean(
      this.search() ||
      this.insumoFiltro() ||
      this.estadoFiltro() ||
      this.venceDesde() ||
      this.venceHasta(),
    ),
  );

  // Un rango invertido no se envia: el backend lo rechazaria con 400.
  rangoInvalido = computed(() => {
    const desde = this.venceDesde();
    const hasta = this.venceHasta();
    return Boolean(desde && hasta && desde > hasta);
  });

  insumos = signal<Insumo[]>([]);
  insumoOptions = computed<SelectOption[]>(() =>
    this.insumos().map((insumo) => ({
      value: String(insumo.id),
      label: `${insumo.sku} · ${insumo.nombre}`,
    })),
  );

  columnas = signal<DsColumn[]>([]);
  lotesPagina = signal<LoteInsumo[]>([]);
  // Orden por vencimiento ascendente dentro de la pagina (los que estan mas
  // proximos a vencer primero), sin fecha al final — pedido explicito del
  // usuario. El backend no garantiza este orden para el listado general sin
  // filtrar por insumo (a diferencia de GET /lotes-insumo?insumo_id=X, que
  // si viene ordenado asi, confirmado por el backend), asi que se ordena
  // aca.
  lotes = computed<FilaLoteGeneral[]>(() =>
    [...this.lotesPagina()]
      .sort((a, b) => {
        if (a.fechaVencimiento === null) return 1;
        if (b.fechaVencimiento === null) return -1;
        return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
      })
      .map((lote) => this.aFila(lote)),
  );
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  ngOnInit(): void {
    this.cargarLotes();
    this.cargarInsumos();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigoLote', header: 'Código de lote' },
      { key: 'insumoNombre', header: 'Insumo', cellTemplate: this.insumoCellTpl },
      { key: 'fechaIngresoMostrada', header: 'Fecha de ingreso', muted: true },
      {
        key: 'fechaVencimientoMostrada',
        header: 'Fecha de vencimiento',
        cellTemplate: this.vencimientoCellTpl,
      },
      { key: 'cantidadInicialMostrada', header: 'Cantidad inicial', numeric: true, muted: true },
      { key: 'cantidadActualMostrada', header: 'Cantidad disponible', numeric: true },
      { key: 'estado', header: 'Estado', cellTemplate: this.estadoCellTpl },
    ]);
  }

  cargarLotes(pagina = this.pagina()): void {
    if (this.rangoInvalido()) return;

    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.loteService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        insumoId: this.insumoFiltro() ? Number(this.insumoFiltro()) : undefined,
        estado: (this.estadoFiltro() as EstadoLote) || undefined,
        venceDesde: this.venceDesde() || undefined,
        venceHasta: this.venceHasta() || undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.lotesPagina.set(resultado.lotes);
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.lotesPagina.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  setSearch(valor: string): void {
    this.search.set(valor);
    this.cargarLotes(1);
  }

  setInsumo(valor: string): void {
    this.insumoFiltro.set(valor);
    this.cargarLotes(1);
  }

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarLotes(1);
  }

  setVenceDesde(valor: string): void {
    this.venceDesde.set(valor);
    this.cargarLotes(1);
  }

  setVenceHasta(valor: string): void {
    this.venceHasta.set(valor);
    this.cargarLotes(1);
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.insumoFiltro.set('');
    this.estadoFiltro.set('');
    this.venceDesde.set('');
    this.venceHasta.set('');
    this.cargarLotes(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarLotes(pagina);
    }
  }

  estadoLabel(estado: EstadoLote): string {
    return ESTADO_LABEL[estado];
  }

  estadoTone(estado: EstadoLote): BadgeTone {
    return ESTADO_TONE[estado];
  }

  private cargarInsumos(): void {
    // Limite alto para traer el catalogo completo en una sola pagina —
    // mismo criterio que el resto de selects de filtro del modulo.
    this.insumoService
      .listar(1, 100, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.insumos.set(pagina.insumos),
        error: () => this.insumos.set([]),
      });
  }

  private aFila(lote: LoteInsumo): FilaLoteGeneral {
    const insumo = this.insumos().find((i) => i.id === lote.insumoId);
    const unidad = insumo ? ` ${insumo.unidadMedida}` : '';
    return {
      codigoLote: lote.codigoLote,
      insumoNombre: insumo?.nombre ?? SIN_DATO,
      insumoSku: insumo?.sku ?? SIN_DATO,
      fechaIngresoMostrada: this.formatearFecha(lote.fechaIngreso),
      fechaVencimientoMostrada: lote.fechaVencimiento
        ? this.formatearFecha(lote.fechaVencimiento)
        : SIN_DATO,
      diasParaVencer:
        lote.estado === 'por_vencer' && lote.fechaVencimiento
          ? this.diasHasta(lote.fechaVencimiento)
          : null,
      cantidadInicialMostrada: `${lote.cantidadInicial}${unidad}`,
      cantidadActualMostrada: `${lote.cantidadActual}${unidad}`,
      estado: lote.estado,
    };
  }

  // Parseo manual (sin new Date(iso) a secas) para no arrastrar el desfase
  // de zona horaria que mete el parseo UTC de "YYYY-MM-DD". slice(0, 10)
  // porque el backend a veces manda la fecha pelada y a veces como datetime
  // completo — en ambos casos los primeros 10 caracteres son lo que importa.
  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(anio, mes - 1, dia));
  }

  private diasHasta(fechaIso: string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000);
  }
}
