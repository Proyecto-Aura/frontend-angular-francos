import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideLayers, LucideSearch } from '@lucide/angular';
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
import {
  EstadoLoteProductoTerminado,
  LoteProductoTerminado,
} from '../../interfaces/lote-producto-terminado.interface';
import { LoteProductoTerminadoService } from '../../services/lote-producto-terminado.service';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
import { LoteFormModal } from '../lote-form-modal/lote-form-modal';

const SIN_DATO = '—';

const ESTADO_LABEL: Record<EstadoLoteProductoTerminado, string> = {
  activo: 'Activo',
  por_vencer: 'Por vencer',
  agotado: 'Agotado',
  vencido: 'Vencido',
};

const ESTADO_TONE: Record<EstadoLoteProductoTerminado, BadgeTone> = {
  activo: 'success',
  por_vencer: 'warning',
  agotado: 'neutral',
  vencido: 'danger',
};

interface FilaLote {
  codigoLote: string;
  productoNombre: string;
  productoConPresentacion: string;
  sku: string;
  fechaProduccionMostrada: string;
  fechaVencimientoMostrada: string;
  diasParaVencer: number | null;
  cantidadInicialMostrada: string;
  cantidadActualMostrada: string;
  estado: EstadoLoteProductoTerminado;
}

// Contenido de la pestaña "Lote" en "Solicitudes de producción" (OFT0-263).
// A diferencia del equivalente de Inventario (solo lectura, los lotes
// nacian por seed), este SI tiene "Agregar lote" — el POST es nuevo
// (confirmado por el backend, rol produccion habilitado para crear).
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
    LoteFormModal,
    Pagination,
    Select,
  ],
  selector: 'app-lotes-producto-terminado-general',
  templateUrl: './lotes-producto-terminado-general.html',
})
export class LotesProductoTerminadoGeneral implements OnInit, AfterViewInit {
  registrado = output<void>();
  private loteService = inject(LoteProductoTerminadoService);
  private productoService = inject(ProductoPresentacionService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

  @ViewChild('vencimientoCell', { static: true })
  vencimientoCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

  readonly LucideLayers = LucideLayers;
  readonly LucideSearch = LucideSearch;

  readonly tamanioPagina = 10;

  readonly estadoOptions: SelectOption[] = [
    { value: 'activo', label: 'Activo' },
    { value: 'por_vencer', label: 'Por vencer' },
    { value: 'agotado', label: 'Agotado' },
    { value: 'vencido', label: 'Vencido' },
  ];

  search = signal('');
  productoFiltro = signal('');
  estadoFiltro = signal('');
  venceDesde = signal('');
  venceHasta = signal('');

  hayFiltros = computed(() =>
    Boolean(
      this.search() ||
      this.productoFiltro() ||
      this.estadoFiltro() ||
      this.venceDesde() ||
      this.venceHasta(),
    ),
  );

  rangoInvalido = computed(() => {
    const desde = this.venceDesde();
    const hasta = this.venceHasta();
    return Boolean(desde && hasta && desde > hasta);
  });

  productoOptions = signal<SelectOption[]>([]);

  columnas = signal<DsColumn[]>([]);
  lotesPagina = signal<LoteProductoTerminado[]>([]);
  // Orden por vencimiento ascendente dentro de la pagina — mismo criterio
  // que el equivalente de Inventario.
  lotes = computed<FilaLote[]>(() =>
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

  modalAbierto = signal(false);

  ngOnInit(): void {
    this.cargarLotes();
    this.cargarProductos();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigoLote', header: 'Código de lote', strong: true },
      { key: 'productoNombre', header: 'Producto', cellTemplate: this.productoCellTpl },
      { key: 'fechaProduccionMostrada', header: 'Fecha de producción', muted: true },
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
        productoTerminadoId: this.productoFiltro() ? Number(this.productoFiltro()) : undefined,
        estado: (this.estadoFiltro() as EstadoLoteProductoTerminado) || undefined,
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

  setProducto(valor: string): void {
    this.productoFiltro.set(valor);
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
    this.productoFiltro.set('');
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

  abrirAgregarLote(): void {
    this.modalAbierto.set(true);
  }

  cerrarForm(): void {
    this.modalAbierto.set(false);
  }

  loteRegistrado(): void {
    this.cerrarForm();
    this.cargarLotes(1);
    this.registrado.emit();
  }

  estadoLabel(estado: EstadoLoteProductoTerminado): string {
    return ESTADO_LABEL[estado];
  }

  estadoTone(estado: EstadoLoteProductoTerminado): BadgeTone {
    return ESTADO_TONE[estado];
  }

  private cargarProductos(): void {
    // Limite alto para traer el catalogo completo en una sola pagina — solo
    // para llenar el select de filtro.
    this.productoService
      .listar(1, 100, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) =>
          this.productoOptions.set(
            pagina.productos
              .filter((p) => p.productoTerminadoId !== null)
              .map((p) => ({
                value: String(p.productoTerminadoId),
                label: `${p.sku} · ${p.productoNombre}`,
              })),
          ),
        error: () => this.productoOptions.set([]),
      });
  }

  private aFila(lote: LoteProductoTerminado): FilaLote {
    return {
      codigoLote: lote.codigoLote,
      productoNombre: lote.productoNombre || SIN_DATO,
      productoConPresentacion: `${lote.productoNombre || SIN_DATO} · ${lote.presentacionCantidad} ${lote.presentacionUnidadMedida}`,
      sku: lote.sku || SIN_DATO,
      fechaProduccionMostrada: this.formatearFecha(lote.fechaProduccion),
      fechaVencimientoMostrada: lote.fechaVencimiento
        ? this.formatearFecha(lote.fechaVencimiento)
        : SIN_DATO,
      diasParaVencer:
        lote.estado === 'por_vencer' && lote.fechaVencimiento
          ? this.diasHasta(lote.fechaVencimiento)
          : null,
      cantidadInicialMostrada: String(lote.cantidadInicial) + ' unid.',
      cantidadActualMostrada: String(lote.cantidadActual) + ' unid.',
      estado: lote.estado,
    };
  }

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
