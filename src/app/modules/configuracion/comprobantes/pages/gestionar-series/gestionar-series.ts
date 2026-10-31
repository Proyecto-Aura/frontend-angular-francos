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
  LucideBan,
  LucideCircleCheck,
  LucideEllipsis,
  LucidePencil,
  LucidePlus,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AvisoBanner } from '../../../../ventas/catalogo/components/aviso-banner/aviso-banner';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../../../../../shared/ds/button/button';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '../../../../../shared/ds/dropdown-menu/dropdown-menu';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { SerieDesactivarModal } from '../../components/serie-desactivar-modal/serie-desactivar-modal';
import { SerieFormModal, SerieGuardada } from '../../components/serie-form-modal/serie-form-modal';
import { SerieVistaPrevia } from '../../components/serie-vista-previa/serie-vista-previa';
import { TipoComprobanteDto } from '../../interfaces/serie-comprobante-dto.interface';
import {
  ETIQUETA_ESTADO,
  EstadoSerie,
  FilaSerie,
  FiltrosSeries,
  SerieComprobante,
  TIPOS_COMPROBANTE,
  UMBRALES_ALERTA,
  coincideConFiltros,
  comprobanteSiguiente,
  etiquetaDeTipo,
  etiquetaUso,
  filaDe,
  formatearCantidad,
  formatearCorrelativo,
  guardarUmbral,
  leerUmbralGuardado,
  porcentajeUsado,
} from '../../interfaces/serie-comprobante.interface';
import { SeriesComprobanteService } from '../../services/series-comprobante.service';

interface RowCtx {
  $implicit: FilaSerie;
  index: number;
}

const FILTROS_INICIALES: FiltrosSeries = { tipo: '', estado: '' };

const TONO_ESTADO: Record<EstadoSerie, BadgeTone> = {
  activa: 'success',
  'por-agotar': 'warning',
  agotada: 'danger',
  inactiva: 'neutral',
};

const COLOR_BARRA: Record<EstadoSerie, string> = {
  activa: 'bg-success',
  'por-agotar': 'bg-warning',
  agotada: 'bg-destructive',
  inactiva: 'bg-success',
};

@Component({
  imports: [
    AvisoBanner,
    Badge,
    Breadcrumb,
    Button,
    CellStack,
    DataTable,
    DropdownMenu,
    FilterBar,
    Icon,
    IconButton,
    Select,
    SerieDesactivarModal,
    SerieFormModal,
    SerieVistaPrevia,
  ],
  selector: 'app-gestionar-series',
  templateUrl: './gestionar-series.html',
})
export class GestionarSeries implements OnInit, AfterViewInit {
  private seriesService = inject(SeriesComprobanteService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('serieCell', { static: true }) serieCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('rangoCell', { static: true }) rangoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('proximoCell', { static: true }) proximoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('usoCell', { static: true }) usoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  protected readonly LucidePlus = LucidePlus;
  protected readonly LucideEllipsis = LucideEllipsis;

  protected readonly migas: BreadcrumbItem[] = [
    { label: 'Configuración' },
    { label: 'Series de comprobantes' },
  ];

  // --- Datos ---
  protected readonly series = signal<SerieComprobante[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly aviso = signal<{ mensaje: string; tono: 'ok' | 'error' }>({
    mensaje: '',
    tono: 'ok',
  });

  // --- Filtros y porcentaje de alerta ---
  protected readonly filtros = signal<FiltrosSeries>({ ...FILTROS_INICIALES });
  protected readonly umbral = signal(leerUmbralGuardado());

  protected readonly opcionesTipo: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    ...TIPOS_COMPROBANTE,
  ];
  protected readonly opcionesEstado: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'activa', label: 'Activa' },
    { value: 'alerta', label: 'Por agotarse' },
    { value: 'inactiva', label: 'Inactiva' },
    { value: 'agotada', label: 'Agotada' },
  ];
  protected readonly opcionesUmbral: SelectOption[] = UMBRALES_ALERTA.map((valor) => ({
    value: String(valor),
    label: `${valor}%`,
  }));

  /** Todas las series con el estado que les toca según el porcentaje elegido. */
  private readonly filas = computed(() => this.series().map((s) => filaDe(s, this.umbral())));
  protected readonly filasFiltradas = computed(() =>
    this.filas().filter((fila) => coincideConFiltros(fila, this.filtros())),
  );

  /** Series activas cuyo rango usado ya llegó al porcentaje elegido. */
  private readonly enAlerta = computed(() => this.filas().filter((f) => f.estado === 'por-agotar'));
  protected readonly cantidadAlertas = computed(() => this.enAlerta().length);
  protected readonly tituloAlerta = computed(() =>
    this.cantidadAlertas() === 1
      ? 'Serie próxima a agotar su rango'
      : 'Series próximas a agotar su rango',
  );
  protected readonly detalleAlertas = computed(
    () =>
      this.enAlerta()
        .map((s) => `${s.codigo}: ${formatearCantidad(s.restantes)} correlativos disponibles`)
        .join(' · ') + '. Ampliar el correlativo final o registrar una nueva serie.',
  );

  protected readonly columns = signal<DsColumn[]>([
    { key: 'serie', header: 'Serie' },
    { key: 'rango', header: 'Rango' },
    { key: 'proximo', header: 'Próximo correlativo' },
    { key: 'uso', header: 'Uso del rango', width: '220px' },
    { key: 'estado', header: 'Estado', width: '140px' },
    { key: 'acciones', header: '', width: '72px', align: 'right' },
  ]);

  // --- Modales ---
  protected readonly formAbierto = signal(false);
  protected readonly serieEnEdicion = signal<SerieComprobante | null>(null);
  protected readonly serieADesactivar = signal<SerieComprobante | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.columns.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'serie') return { ...columna, cellTemplate: this.serieCellTpl };
        if (columna.key === 'rango') return { ...columna, cellTemplate: this.rangoCellTpl };
        if (columna.key === 'proximo') return { ...columna, cellTemplate: this.proximoCellTpl };
        if (columna.key === 'uso') return { ...columna, cellTemplate: this.usoCellTpl };
        if (columna.key === 'estado') return { ...columna, cellTemplate: this.estadoCellTpl };
        if (columna.key === 'acciones') return { ...columna, cellTemplate: this.accionesCellTpl };
        return columna;
      }),
    );
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.seriesService
      .listar()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (series) => this.series.set(series),
        error: (error: unknown) =>
          this.errorCarga.set(apiErrorMessage(error, 'No se pudo cargar las series.')),
      });
  }

  // --- Filtros ---
  protected cambiarTipo(tipo: string): void {
    this.filtros.update((actuales) => ({ ...actuales, tipo: tipo as '' | TipoComprobanteDto }));
  }

  protected cambiarEstado(estado: string): void {
    this.filtros.update((actuales) => ({ ...actuales, estado: estado as FiltrosSeries['estado'] }));
  }

  protected cambiarUmbral(valor: string): void {
    const umbral = Number(valor);
    guardarUmbral(umbral);
    this.umbral.set(umbral);
  }

  // --- Celdas ---
  protected etiquetaTipo = etiquetaDeTipo;
  protected etiquetaEstado = (estado: EstadoSerie) => ETIQUETA_ESTADO[estado];
  protected tonoEstado = (estado: EstadoSerie) => TONO_ESTADO[estado];
  protected colorBarra = (estado: EstadoSerie) => COLOR_BARRA[estado];
  protected proximo = (serie: SerieComprobante) => comprobanteSiguiente(serie) ?? '—';
  protected rango = (serie: SerieComprobante) =>
    `${formatearCorrelativo(serie.inicio)} – ${formatearCorrelativo(serie.fin)}`;
  /** El ancho de la barra: al menos 1 % si ya se usó algo, para que se vea. */
  protected ancho = (serie: SerieComprobante) => {
    const porcentaje = porcentajeUsado(serie);
    return porcentaje > 0 ? Math.max(porcentaje, 1) : 0;
  };
  protected usoTexto = (serie: SerieComprobante) =>
    `${etiquetaUso(serie)} · ${formatearCantidad(serie.restantes)} disponibles`;

  /**
   * Se calculan una vez por lista: un método que devolviera un arreglo nuevo en
   * cada ciclo de detección haría que el menú se vuelva a asignar sin parar.
   */
  protected readonly accionesPorSerie = computed(
    () => new Map(this.filas().map((fila) => [fila.id, this.accionesDe(fila)])),
  );

  private accionesDe(serie: FilaSerie): DropdownMenuItem[] {
    const acciones: DropdownMenuItem[] = [
      { label: 'Editar', icon: LucidePencil, onSelect: () => this.editar(serie) },
    ];
    if (serie.activa) {
      acciones.push(
        { separator: true },
        {
          label: 'Desactivar',
          icon: LucideBan,
          destructive: true,
          onSelect: () => this.serieADesactivar.set(serie),
        },
      );
    } else if (serie.estado !== 'agotada') {
      acciones.push({
        label: 'Activar',
        icon: LucideCircleCheck,
        onSelect: () => this.activar(serie),
      });
    }
    return acciones;
  }

  // --- Acciones ---
  protected nueva(): void {
    this.serieEnEdicion.set(null);
    this.formAbierto.set(true);
  }

  protected editar(serie: SerieComprobante): void {
    this.serieEnEdicion.set(serie);
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    this.formAbierto.set(false);
  }

  protected alGuardar({ serie, modo }: SerieGuardada): void {
    this.mostrarAviso(
      modo === 'nueva'
        ? `Serie ${serie.codigo} creada correctamente`
        : `Serie ${serie.codigo} actualizada`,
    );
    this.cargar();
  }

  protected alDesactivar(serie: SerieComprobante): void {
    this.mostrarAviso(`Serie ${serie.codigo} desactivada`);
    this.cargar();
  }

  private activar(serie: SerieComprobante): void {
    this.seriesService
      .activar(serie.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activada) => {
          this.mostrarAviso(`Serie ${activada.codigo} activada`);
          this.cargar();
        },
        error: (error: unknown) =>
          this.mostrarAviso(
            apiErrorMessage(error, 'No se pudo activar la serie. Intente nuevamente.'),
            'error',
          ),
      });
  }

  protected mostrarAviso(mensaje: string, tono: 'ok' | 'error' = 'ok'): void {
    this.aviso.set({ mensaje, tono });
  }

  protected cerrarAviso(): void {
    this.aviso.set({ mensaje: '', tono: 'ok' });
  }
}
