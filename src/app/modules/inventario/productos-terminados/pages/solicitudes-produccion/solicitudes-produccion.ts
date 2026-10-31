import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
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
import { SolicitudDetalleModal } from '../../components/solicitud-detalle-modal/solicitud-detalle-modal';
import { SolicitudEditarModal } from '../../components/solicitud-editar-modal/solicitud-editar-modal';
import { SolicitudProduccionFormModal } from '../../components/solicitud-produccion-form-modal/solicitud-produccion-form-modal';
import {
  EstadoSolicitudProduccion,
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
} from '../../interfaces/solicitud-produccion.interface';
import {
  etiquetaEstadoSolicitud,
  tonoEstadoSolicitud,
} from '../../mappers/solicitud-produccion.mapper';
import { SolicitudProduccionService } from '../../services/solicitud-produccion.service';

interface FilaSolicitud {
  // El objeto original, para cuando se conecten las acciones de fila.
  solicitud: SolicitudProduccion;
  codigo: string;
  // Solo el conteo (no los nombres): con varios productos no entraban
  // legibles en una celda de tabla — el detalle completo queda para "Ver
  // detalle" (pedido del usuario).
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

// "Solicitudes a produccion" (OFT0-261): KPIs + filtros + tabla, mismo
// patron visual que el resto del modulo. Listar, crear, indicadores, "Ver
// detalle" y "Editar" ya estan conectados a la API real (confirmado por el
// backend) — GET /solicitudes-produccion/indicadores reemplaza el
// workaround de 4 pedidos en paralelo por estado que se uso mientras no
// existia. Las etiquetas visuales ("Entregado"/"Rechazado" para
// entregado/rechazado) estan centralizadas en el mapper
// (etiquetaEstadoSolicitud/tonoEstadoSolicitud) porque el modal de detalle
// tambien las necesita. Las acciones de fila solo aparecen en pendiente.
// Cancelar cambia el estado a rechazado mediante PATCH .../estado.
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
    SolicitudDetalleModal,
    SolicitudEditarModal,
    SolicitudProduccionFormModal,
  ],
  selector: 'app-solicitudes-produccion',
  templateUrl: './solicitudes-produccion.html',
})
export class SolicitudesProduccion implements OnInit, AfterViewInit {
  private solicitudService = inject(SolicitudProduccionService);
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

  // --- Filtros (van contra el backend: search/estado/fecha_desde/
  // fecha_hasta son query params reales de GET /solicitudes-produccion).
  // Un solo campo "Fecha" en la UI (como en el mockup) se manda como rango
  // de un solo dia (fecha_desde = fecha_hasta).
  search = signal('');
  estadoFiltro = signal('');
  fecha = signal('');

  columnas = signal<DsColumn[]>([]);
  solicitudes = signal<FilaSolicitud[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);
  cancelandoId = signal<number | null>(null);
  errorCancelacion = signal('');

  resumen = signal<ResumenSolicitudesProduccion>(RESUMEN_VACIO);

  modalAbierto = signal(false);
  // null = cerrado. Se abre con el id de la fila clickeada en "Ver detalle";
  // el modal pide GET /solicitudes-produccion/:id por su cuenta.
  solicitudDetalleId = signal<number | null>(null);
  // Idem, para "Editar" — solo se habilita el icono (ver puedeEditar()) con
  // estado "pendiente" (confirmado por el backend: el PATCH de fecha_limite
  // y el alta/baja/edicion de lineas devuelven 409 en cualquier otro
  // estado), asi que este modal solo se abre para solicitudes pendientes.
  solicitudEditarId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.cargarResumen();
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
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.solicitudService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        estado: (this.estadoFiltro() as EstadoSolicitudProduccion) || undefined,
        fechaDesde: this.fecha() || undefined,
        fechaHasta: this.fecha() || undefined,
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

  setFecha(valor: string): void {
    this.fecha.set(valor);
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

  verDetalle(solicitud: SolicitudProduccion): void {
    this.solicitudDetalleId.set(solicitud.id);
  }

  cerrarDetalle(): void {
    this.solicitudDetalleId.set(null);
  }

  puedeEditar(solicitud: SolicitudProduccion): boolean {
    return solicitud.estado === 'pendiente';
  }

  cancelarSolicitud(solicitud: SolicitudProduccion): void {
    if (!this.puedeEditar(solicitud) || this.cancelandoId() !== null) return;
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

  editarSolicitud(solicitud: SolicitudProduccion): void {
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

  // Parseo manual (sin new Date(iso) a secas) para no arrastrar el desfase
  // de zona horaria que mete el parseo UTC de "YYYY-MM-DD" — mismo criterio
  // que el resto del modulo (ver lotes-insumo-general.ts).
  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(anio, mes - 1, dia));
  }
}
