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
  LucideClipboardList,
  LucideClock,
  LucideEye,
  LucideLayers,
  LucidePackage,
  LucidePackageCheck,
  LucidePlay,
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
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { LotesProductoTerminadoGeneral } from '../../components/lotes-producto-terminado-general/lotes-producto-terminado-general';
import { SolicitudDetalleModal } from '../../components/solicitud-detalle-modal/solicitud-detalle-modal';
import {
  EstadoSolicitudProduccion,
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
} from '../../interfaces/solicitud-produccion.interface';
import {
  etiquetaAccionSiguienteEstado,
  etiquetaEstadoSolicitud,
  puedeRechazarSolicitud,
  siguienteEstadoSolicitud,
  tonoEstadoSolicitud,
} from '../../mappers/solicitud-produccion.mapper';
import { SolicitudProduccionService } from '../../services/solicitud-produccion.service';
import { LoteProductoTerminadoService } from '../../services/lote-producto-terminado.service';

interface FilaSolicitud {
  solicitud: SolicitudProduccion;
  codigo: string;
  cantidadProductos: number;
  fechaSolicitudMostrada: string;
  fechaLimiteMostrada: string;
  solicitante: string;
  estado: EstadoSolicitudProduccion;
}

const RESUMEN_VACIO: ResumenSolicitudesProduccion = {
  pendientes: 0,
  enProceso: 0,
  completadas: 0,
  canceladas: 0,
};

// "Solicitudes de producción" dentro del modulo Produccion (OFT0-263):
// misma tabla/filtros/KPIs que ya existen en Inventario > Solicitudes a
// produccion (OFT0-261, mismos 4 endpoints de /solicitudes-produccion,
// confirmado por el backend que el rol "produccion" ya esta habilitado),
// pero con otras acciones. En Inventario el usuario solo ve y puede
// rechazar (desde pendiente); aca el usuario SI avanza el estado
// activamente: "Iniciar producción" (pendiente -> en_proceso) y "Marcar
// entregado" (en_proceso -> entregado), ademas de "Rechazar" (solo desde
// pendiente, igual que Inventario). No hay "Nueva solicitud" ni "Editar":
// esos flujos siguen siendo exclusivos de Inventario.
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
    LotesProductoTerminadoGeneral,
    Pagination,
    Select,
    SolicitudDetalleModal,
    Tabs,
  ],
  selector: 'app-solicitudes-produccion',
  templateUrl: './solicitudes-produccion.html',
})
export class SolicitudesProduccion implements OnInit, AfterViewInit {
  private solicitudService = inject(SolicitudProduccionService);
  private loteService = inject(LoteProductoTerminadoService);
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
  readonly LucidePackageCheck = LucidePackageCheck;
  readonly LucidePlay = LucidePlay;
  readonly LucideSearch = LucideSearch;

  readonly tamanioPagina = 10;

  // Pestañas "Solicitudes"/"Lote" (OFT0-263) — mismo patron que
  // Stock/Historial/Lotes en Stock de insumos: todo vive en una sola
  // pagina/ruta, sin navegacion. "Lote" es contenido nuevo (antes de
  // produccion-solicitudes solo existian solicitudes).
  activeTab = signal<'solicitudes' | 'lote'>('solicitudes');
  lotesTotal = signal<number | undefined>(undefined);
  readonly tabs = computed<DsTab[]>(() => {
    const resumen = this.resumen();
    return [
      {
        id: 'solicitudes',
        label: 'Solicitudes',
        icon: LucideClipboardList,
        count: resumen.pendientes + resumen.enProceso + resumen.completadas + resumen.canceladas,
      },
      { id: 'lote', label: 'Lote', icon: LucideLayers, count: this.lotesTotal() },
    ];
  });

  cargarLotesTotal(): void {
    this.loteService
      .listar(1, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.lotesTotal.set(pagina.total),
        error: () => this.lotesTotal.set(undefined),
      });
  }

  cambiarTab(id: string): void {
    this.activeTab.set(id === 'lote' ? 'lote' : 'solicitudes');
  }

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
  // Id de la solicitud cuyo PATCH .../estado esta en vuelo — deshabilita
  // las acciones de esa fila para evitar doble click mientras responde.
  cambiandoId = signal<number | null>(null);
  errorCambioEstado = signal('');

  resumen = signal<ResumenSolicitudesProduccion>(RESUMEN_VACIO);

  // null = cerrado. Se abre con el id de la fila clickeada en "Ver detalle"
  // o "Registrar entrega"; el modal pide GET /solicitudes-produccion/:id
  // por su cuenta. modalModo decide si abre en modo lectura o en el modo
  // que agrega la columna "Stock actual" + el boton "Registrar entrega".
  solicitudDetalleId = signal<number | null>(null);
  modalModo = signal<'ver' | 'entregar'>('ver');

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.cargarResumen();
    this.cargarLotesTotal();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigo', header: 'Solicitud', strong: true },
      { key: 'cantidadProductos', header: 'Productos solicitados', numeric: true },
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
        estado: (this.estadoFiltro() as EstadoSolicitudProduccion) || undefined,
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

  verDetalle(solicitud: SolicitudProduccion): void {
    this.modalModo.set('ver');
    this.solicitudDetalleId.set(solicitud.id);
  }

  abrirEntrega(solicitud: SolicitudProduccion): void {
    this.modalModo.set('entregar');
    this.solicitudDetalleId.set(solicitud.id);
  }

  cerrarDetalle(): void {
    this.solicitudDetalleId.set(null);
  }

  accionSiguiente(estado: EstadoSolicitudProduccion): string | null {
    return etiquetaAccionSiguienteEstado(estado);
  }

  puedeRechazar(estado: EstadoSolicitudProduccion): boolean {
    return puedeRechazarSolicitud(estado);
  }

  avanzarEstado(solicitud: SolicitudProduccion): void {
    const siguiente = siguienteEstadoSolicitud(solicitud.estado);
    if (!siguiente || this.cambiandoId() !== null) return;
    this.cambiarEstado(solicitud, siguiente);
  }

  rechazarSolicitud(solicitud: SolicitudProduccion): void {
    if (!this.puedeRechazar(solicitud.estado) || this.cambiandoId() !== null) return;
    this.cambiarEstado(solicitud, 'rechazado');
  }

  private cambiarEstado(solicitud: SolicitudProduccion, estado: EstadoSolicitudProduccion): void {
    this.cambiandoId.set(solicitud.id);
    this.errorCambioEstado.set('');
    this.solicitudService
      .cambiarEstado(solicitud.id, estado)
      .pipe(
        finalize(() => this.cambiandoId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.recargarTodo(),
        error: (error) => {
          this.errorCambioEstado.set(
            error.status === 409
              ? 'La solicitud ya cambió de estado. Se actualizará la lista.'
              : 'No se pudo actualizar el estado. Intenta nuevamente.',
          );
          if (error.status === 409) this.recargarTodo();
        },
      });
  }

  estadoLabel(estado: EstadoSolicitudProduccion): string {
    return etiquetaEstadoSolicitud(estado);
  }

  estadoTone(estado: EstadoSolicitudProduccion): BadgeTone {
    return tonoEstadoSolicitud(estado);
  }

  private aFila(s: SolicitudProduccion): FilaSolicitud {
    return {
      solicitud: s,
      codigo: s.codigo,
      cantidadProductos: s.cantidadProductos ?? s.detalle.length,
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
