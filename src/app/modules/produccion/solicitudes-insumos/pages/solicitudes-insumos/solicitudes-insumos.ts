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
  LucideClock,
  LucideEye,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideSearch,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { SolicitudInsumoDetalleModal } from '../../components/solicitud-insumo-detalle-modal/solicitud-insumo-detalle-modal';
import { SolicitudInsumoEditarModal } from '../../components/solicitud-insumo-editar-modal/solicitud-insumo-editar-modal';
import { SolicitudInsumoFormModal } from '../../components/solicitud-insumo-form-modal/solicitud-insumo-form-modal';
import {
  EstadoSolicitudInsumo,
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
} from '../../interfaces/solicitud-insumo.interface';
import {
  etiquetaEstadoSolicitudInsumo,
  puedeRechazarSolicitudInsumo,
  tonoEstadoSolicitudInsumo,
} from '../../mappers/solicitud-insumo.mapper';
import { SolicitudInsumoService } from '../../services/solicitud-insumo.service';

interface FilaSolicitud {
  solicitud: SolicitudInsumo;
  codigo: string;
  cantidadInsumos: number;
  fechaSolicitudMostrada: string;
  fechaLimiteMostrada: string;
  solicitante: string;
  estado: EstadoSolicitudInsumo;
}

const RESUMEN_VACIO: ResumenSolicitudesInsumo = {
  pendientes: 0,
  enProceso: 0,
  completadas: 0,
  canceladas: 0,
};

// "Solicitudes de insumos" (OFT0-264) — Produccion le pide insumos a
// Inventario, simetrico a "Solicitudes a produccion" (Inventario le pide
// produccion a Produccion, OFT0-261): mismos KPIs/filtros/tabla/modales,
// con roles invertidos (confirmado por el backend) — admin/produccion
// crean y editan (mientras "pendiente"), inventario avanza el estado
// (iniciar/entregar) desde su propia vista (fuera de alcance aca). Esta
// pagina solo ve/crea/edita/rechaza, igual que Inventario en el flujo
// analogo.
@Component({
  imports: [
    Badge,
    Button,
    Card,
    DataTable,
    FilterBar,
    Icon,
    IconButton,
    Input,
    KpiCard,
    Pagination,
    Select,
    SolicitudInsumoDetalleModal,
    SolicitudInsumoEditarModal,
    SolicitudInsumoFormModal,
  ],
  selector: 'app-solicitudes-insumos',
  templateUrl: './solicitudes-insumos.html',
})
export class SolicitudesInsumos implements OnInit, AfterViewInit {
  private solicitudService = inject(SolicitudInsumoService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: FilaSolicitud; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: FilaSolicitud; index: number }>;

  readonly LucideBan = LucideBan;
  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideClock = LucideClock;
  readonly LucideEye = LucideEye;
  readonly LucidePackage = LucidePackage;
  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;
  readonly LucideSearch = LucideSearch;

  readonly tamanioPagina = 10;

  readonly estadoOptions: SelectOption[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'rechazado', label: 'Rechazado' },
  ];

  search = signal('');
  estadoFiltro = signal('');
  fechaDesde = signal('');
  fechaHasta = signal('');
  rangoInvalido = computed(() =>
    Boolean(this.fechaDesde() && this.fechaHasta() && this.fechaDesde() > this.fechaHasta()),
  );

  columnas = signal<DsColumn[]>([]);
  solicitudes = signal<FilaSolicitud[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);
  cancelandoId = signal<number | null>(null);
  errorCancelacion = signal('');

  resumen = signal<ResumenSolicitudesInsumo>(RESUMEN_VACIO);

  modalAbierto = signal(false);
  // null = cerrado. Se abre con el id de la fila clickeada en "Ver detalle";
  // el modal pide GET .../:id por su cuenta.
  solicitudDetalleId = signal<number | null>(null);
  // Idem, para "Editar" — solo se habilita el icono (ver puedeEditar()) con
  // estado "pendiente" (mismo criterio que solicitud de produccion: el
  // PATCH de fecha_limite y el alta/baja/edicion de lineas devuelven 409 en
  // cualquier otro estado).
  solicitudEditarId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.cargarResumen();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigo', header: 'Solicitud', strong: true },
      { key: 'cantidadInsumos', header: 'Insumos solicitados', numeric: true },
      { key: 'fechaSolicitudMostrada', header: 'Fecha solicitud', muted: true },
      { key: 'fechaLimiteMostrada', header: 'Fecha límite', muted: true },
      { key: 'solicitante', header: 'Solicitante' },
      { key: 'estado', header: 'Estado', cellTemplate: this.estadoCellTpl },
      { key: 'acciones', header: 'Acciones', align: 'right', cellTemplate: this.accionesCellTpl },
    ]);
  }

  cargarSolicitudes(pagina = this.pagina()): void {
    if (this.rangoInvalido()) return;
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.solicitudService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        estado: (this.estadoFiltro() as EstadoSolicitudInsumo) || undefined,
        fechaDesde: this.fechaDesde() || undefined,
        fechaHasta: this.fechaHasta() || undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.solicitudes.set(resultado.solicitudes.map((s) => this.aFila(s)));
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.solicitudes.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  cargarResumen(): void {
    this.solicitudService
      .indicadores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => this.resumen.set(resumen),
        error: () => this.resumen.set(RESUMEN_VACIO),
      });
  }

  recargarTodo(): void {
    this.cargarSolicitudes(this.pagina());
    this.cargarResumen();
  }

  setSearch(valor: string): void {
    this.search.set(valor);
    this.cargarSolicitudes(1);
  }

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarSolicitudes(1);
  }

  setFechaDesde(valor: string): void {
    this.fechaDesde.set(valor);
    this.cargarSolicitudes(1);
  }

  setFechaHasta(valor: string): void {
    this.fechaHasta.set(valor);
    this.cargarSolicitudes(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarSolicitudes(pagina);
    }
  }

  abrirNuevaSolicitud(): void {
    this.modalAbierto.set(true);
  }

  cerrarForm(): void {
    this.modalAbierto.set(false);
  }

  solicitudCreada(): void {
    this.cerrarForm();
    this.recargarTodo();
  }

  verDetalle(solicitud: SolicitudInsumo): void {
    this.solicitudDetalleId.set(solicitud.id);
  }

  cerrarDetalle(): void {
    this.solicitudDetalleId.set(null);
  }

  puedeEditar(solicitud: SolicitudInsumo): boolean {
    return solicitud.estado === 'pendiente';
  }

  puedeRechazar(estado: EstadoSolicitudInsumo): boolean {
    return puedeRechazarSolicitudInsumo(estado);
  }

  cancelarSolicitud(solicitud: SolicitudInsumo): void {
    if (!this.puedeRechazar(solicitud.estado) || this.cancelandoId() !== null) return;
    this.cancelandoId.set(solicitud.id);
    this.errorCancelacion.set('');
    this.solicitudService
      .cancelar(solicitud.id)
      .pipe(
        finalize(() => this.cancelandoId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.solicitudes.update((filas) =>
            filas.map((fila) =>
              fila.solicitud.id === solicitud.id
                ? {
                    ...fila,
                    estado: 'rechazado',
                    solicitud: { ...fila.solicitud, estado: 'rechazado' },
                  }
                : fila,
            ),
          );
          this.recargarTodo();
        },
        error: (error) => {
          this.errorCancelacion.set(
            error.status === 409
              ? 'La solicitud ya no está pendiente. Se actualizará la lista.'
              : 'No se pudo cancelar la solicitud. Intenta nuevamente.',
          );
          if (error.status === 409) this.recargarTodo();
        },
      });
  }

  editarSolicitud(solicitud: SolicitudInsumo): void {
    if (this.puedeEditar(solicitud)) {
      this.solicitudEditarId.set(solicitud.id);
    }
  }

  cerrarEditar(): void {
    this.solicitudEditarId.set(null);
  }

  solicitudEditada(): void {
    this.cerrarEditar();
    this.recargarTodo();
  }

  estadoLabel(estado: EstadoSolicitudInsumo): string {
    return etiquetaEstadoSolicitudInsumo(estado);
  }

  estadoTone(estado: EstadoSolicitudInsumo): BadgeTone {
    return tonoEstadoSolicitudInsumo(estado);
  }

  private aFila(s: SolicitudInsumo): FilaSolicitud {
    return {
      solicitud: s,
      codigo: s.codigo,
      cantidadInsumos: s.cantidadInsumos ?? s.detalle.length,
      fechaSolicitudMostrada: this.formatearFecha(s.fechaCreacion),
      fechaLimiteMostrada: s.fechaLimite ? this.formatearFecha(s.fechaLimite) : '—',
      solicitante: s.solicitadoPorNombre,
      estado: s.estado,
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
}
