import {
  AfterViewInit,
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideEye } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  EstadoSolicitudProduccion,
  SolicitudProduccion,
} from '../../interfaces/solicitud-produccion.interface';
import {
  etiquetaEstadoSolicitud,
  tonoEstadoSolicitud,
} from '../../mappers/solicitud-produccion.mapper';
import { SolicitudProduccionService } from '../../services/solicitud-produccion.service';

const SIN_DATO = '—';

interface Campo {
  label: string;
  value: string;
}

interface FilaDetalle {
  id: number;
  productoNombre: string;
  sku: string;
  presentacionMostrada: string;
  cantidadSolicitadaMostrada: string;
}

// "Ver detalle" de una solicitud a produccion, dentro del modulo Produccion
// (OFT0-263) — conectado a GET /solicitudes-produccion/:id (SI trae el
// detalle embebido siempre, a diferencia del listado). Solo lectura: el
// avance de estado (Iniciar produccion / Marcar entregado / Rechazar) vive
// en la fila de la tabla, no aca, mismo criterio que el modal equivalente
// de Inventario. A diferencia de ese modal, este NO cruza el stock actual
// contra /producto-presentaciones (esa complejidad es propia de Inventario,
// que gestiona el catalogo; Produccion solo necesita ver que se pidio).
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Modal],
  selector: 'app-solicitud-detalle-modal',
  templateUrl: './solicitud-detalle-modal.html',
})
export class SolicitudDetalleModal implements AfterViewInit {
  private solicitudService = inject(SolicitudProduccionService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  /** null = cerrado. */
  solicitudId = input<number | null>(null);
  closed = output<void>();

  readonly LucideEye = LucideEye;

  columnas = signal<DsColumn[]>([]);
  solicitud = signal<SolicitudProduccion | null>(null);
  cargando = signal(false);
  error = signal(false);

  constructor() {
    effect(() => {
      const id = this.solicitudId();
      if (id !== null) {
        this.cargar(id);
      }
    });
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'productoNombre', header: 'Producto', cellTemplate: this.productoCellTpl },
      { key: 'presentacionMostrada', header: 'Presentación', muted: true },
      {
        key: 'cantidadSolicitadaMostrada',
        header: 'Cantidad solicitada',
        numeric: true,
        strong: true,
      },
    ]);
  }

  cargar(id: number): void {
    this.cargaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set(false);

    this.cargaSub = this.solicitudService
      .obtener(id)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (solicitud) => this.solicitud.set(solicitud),
        error: () => {
          this.solicitud.set(null);
          this.error.set(true);
        },
      });
  }

  reintentar(): void {
    const id = this.solicitudId();
    if (id !== null) this.cargar(id);
  }

  titulo = computed(() => {
    const s = this.solicitud();
    return s ? `Solicitud ${s.codigo}` : 'Solicitud';
  });

  campos = computed<Campo[]>(() => {
    const s = this.solicitud();
    if (!s) return [];
    return [
      { label: 'Solicitud', value: s.codigo },
      { label: 'Fecha solicitud', value: this.formatearFechaHora(s.fechaCreacion) },
      {
        label: 'Fecha límite',
        value: s.fechaLimite ? this.formatearFecha(s.fechaLimite) : SIN_DATO,
      },
      { label: 'Solicitante', value: s.solicitadoPorNombre },
    ];
  });

  filas = computed<FilaDetalle[]>(() => {
    const s = this.solicitud();
    if (!s) return [];
    return s.detalle.map((d) => ({
      id: d.id,
      productoNombre: d.productoNombre,
      sku: d.sku,
      presentacionMostrada: `${d.presentacionCantidad} ${d.presentacionUnidadMedida}`,
      cantidadSolicitadaMostrada: `${d.cantidadSolicitada} unid.`,
    }));
  });

  estadoLabel(estado: EstadoSolicitudProduccion): string {
    return etiquetaEstadoSolicitud(estado);
  }

  estadoTone(estado: EstadoSolicitudProduccion): BadgeTone {
    return tonoEstadoSolicitud(estado);
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.solicitud.set(null);
    this.error.set(false);
    this.closed.emit();
  }

  // Parseo manual para fechas "puras" YYYY-MM-DD (sin desfase de zona
  // horaria) — mismo criterio que el resto del modulo.
  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(anio, mes - 1, dia));
  }

  private formatearFechaHora(fechaIso: string): string {
    const esSoloFecha = fechaIso.length <= 10;
    let fecha: Date;
    if (esSoloFecha) {
      const [anio, mes, dia] = fechaIso.split('-').map(Number);
      fecha = new Date(anio, mes - 1, dia);
    } else {
      fecha = new Date(fechaIso);
    }

    const fechaMostrada = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
    const horaMostrada = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
    return `${fechaMostrada} · ${horaMostrada}`;
  }
}
