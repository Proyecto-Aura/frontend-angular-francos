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
import { SolicitudInsumoDetalleModal } from '../../components/solicitud-insumo-detalle-modal/solicitud-insumo-detalle-modal';
import {
  DisponibilidadSolicitudInsumo,
  EstadoSolicitudInsumo,
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
} from '../../interfaces/solicitud-insumo.interface';
import {
  etiquetaAccionSiguienteEstadoInsumo,
  etiquetaDisponibilidadSolicitudInsumo,
  etiquetaEstadoSolicitudInsumo,
  puedeCancelarSolicitudInsumo,
  siguienteEstadoSolicitudInsumo,
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
  // Solo tiene sentido mientras "pendiente" — se pide siempre con
  // conDisponibilidad=true (ver el servicio) para poder deshabilitar
  // "Iniciar entrega" sin abrir el detalle de cada fila.
  disponibilidad?: DisponibilidadSolicitudInsumo;
}

const RESUMEN_VACIO: ResumenSolicitudesInsumo = {
  pendientes: 0,
  enProceso: 0,
  completadas: 0,
  canceladas: 0,
};

// "Solicitudes de insumos" dentro de Inventario > Insumos (OFT0-264, lado
// "cumplir" de produccion/solicitudes-insumos, mismo patron que Produccion >
// Solicitudes de produccion): misma tabla/filtros/KPIs que ya existen ahi,
// conectada a los mismos 4 endpoints de /produccion/solicitudes-insumos
// (confirmado por el backend que el rol "inventario" ya esta habilitado).
// Roles invertidos vs. solicitud de produccion: aca el usuario SI avanza el
// estado activamente — "Iniciar entrega" (pendiente -> en_proceso) y
// "Marcar entregado" (en_proceso -> entregado, dispara la salida real de
// stock del lado del backend). Tambien puede cancelar (-> rechazado, pedido
// explicito del usuario) mientras la solicitud sigue "pendiente" — una vez
// que ya paso a "en_proceso" ya no se puede cancelar desde aca (ver
// puedeCancelarSolicitudInsumo). No hay "Nueva solicitud" ni "Editar": esos
// flujos son exclusivos de Produccion.
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
  readonly LucidePackageCheck = LucidePackageCheck;
  readonly LucidePlay = LucidePlay;
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
  rangoInvalido = signal(false);

  columnas = signal<DsColumn[]>([]);
  solicitudes = signal<FilaSolicitud[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);
  // Id de la solicitud cuyo PATCH .../estado esta en vuelo — deshabilita las
  // acciones de esa fila para evitar doble click mientras responde.
  cambiandoId = signal<number | null>(null);
  errorCambioEstado = signal('');

  resumen = signal<ResumenSolicitudesInsumo>(RESUMEN_VACIO);

  // null = cerrado. Se abre con el id de la fila clickeada en "Ver detalle"
  // o "Registrar entrega"; el modal pide GET .../:id por su cuenta.
  // modalModo decide si abre en modo lectura o en el modo que agrega
  // "Stock actual" + el boton "Registrar entrega".
  solicitudDetalleId = signal<number | null>(null);
  modalModo = signal<'ver' | 'entregar'>('ver');

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
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    this.rangoInvalido.set(Boolean(desde && hasta && desde > hasta));
    if (this.rangoInvalido()) return;

    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.solicitudService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        estado: (this.estadoFiltro() as EstadoSolicitudInsumo) || undefined,
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
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

  verDetalle(solicitud: SolicitudInsumo): void {
    this.modalModo.set('ver');
    this.solicitudDetalleId.set(solicitud.id);
  }

  abrirEntrega(solicitud: SolicitudInsumo): void {
    this.modalModo.set('entregar');
    this.solicitudDetalleId.set(solicitud.id);
  }

  cerrarDetalle(): void {
    this.solicitudDetalleId.set(null);
  }

  accionSiguiente(estado: EstadoSolicitudInsumo): string | null {
    return etiquetaAccionSiguienteEstadoInsumo(estado);
  }

  // "Iniciar entrega" (pendiente -> en_proceso) es un PATCH directo desde la
  // fila — "Marcar entregado" (en_proceso -> entregado) abre el modal en
  // modo="entregar" en vez de disparar el PATCH aca mismo (ver abrirEntrega),
  // porque ese paso SI mueve stock real y conviene mostrar "Stock actual"
  // antes de confirmar.
  //
  // "Iniciar entrega" se bloquea si la disponibilidad no es "completo"
  // (pedido explicito del usuario, mismo criterio que "Iniciar preparación"
  // en Pedidos por preparar) — el boton ya queda deshabilitado en la
  // plantilla, esto es solo el guard defensivo por si igual se dispara.
  avanzarEstado(solicitud: SolicitudInsumo): void {
    const siguiente = siguienteEstadoSolicitudInsumo(solicitud.estado);
    if (!siguiente || this.cambiandoId() !== null) return;

    if (siguiente === 'en_proceso' && solicitud.disponibilidad !== 'completo') return;

    if (siguiente === 'entregado') {
      this.abrirEntrega(solicitud);
      return;
    }

    this.cambiarEstado(solicitud, siguiente);
  }

  // Texto del icon-button "Iniciar entrega" — explica por que esta
  // deshabilitado en vez de solo mostrar "Iniciar entrega" sin motivo
  // (mismo criterio que tooltipIniciar() en Pedidos).
  tooltipIniciar(fila: FilaSolicitud): string {
    if (!fila.disponibilidad || fila.disponibilidad === 'completo') return 'Iniciar entrega';
    return etiquetaDisponibilidadSolicitudInsumo(fila.disponibilidad);
  }

  puedeCancelar(estado: EstadoSolicitudInsumo): boolean {
    return puedeCancelarSolicitudInsumo(estado);
  }

  cancelarSolicitud(solicitud: SolicitudInsumo): void {
    if (!this.puedeCancelar(solicitud.estado) || this.cambiandoId() !== null) return;
    this.cambiarEstado(solicitud, 'rechazado');
  }

  private cambiarEstado(solicitud: SolicitudInsumo, estado: EstadoSolicitudInsumo): void {
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
      disponibilidad: s.disponibilidad,
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
