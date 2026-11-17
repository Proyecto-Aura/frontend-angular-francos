import {
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
  EstadoSolicitudInsumo,
  SolicitudInsumo,
} from '../../interfaces/solicitud-insumo.interface';
import {
  etiquetaEstadoSolicitudInsumo,
  tonoEstadoSolicitudInsumo,
} from '../../mappers/solicitud-insumo.mapper';
import { SolicitudInsumoService } from '../../services/solicitud-insumo.service';

const SIN_DATO = '—';

interface Campo {
  label: string;
  value: string;
}

interface FilaDetalle {
  id: number;
  insumoNombre: string;
  sku: string;
  unidadMedidaMostrada: string;
  cantidadSolicitadaMostrada: string;
}

// "Ver detalle" de una solicitud de insumos (OFT0-264) — conectado a
// GET /produccion/solicitudes-insumos/:id (SI trae el detalle embebido
// siempre, a diferencia del listado). Solo lectura: el avance de estado
// (Iniciar/Entregar) lo hace inventario desde su propia vista, no aca; el
// rechazo (producción, mientras "pendiente") vive en el icono de la fila,
// igual que "Cancelar" en el equivalente de solicitud de produccion.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Modal],
  selector: 'app-solicitud-insumo-detalle-modal',
  templateUrl: './solicitud-insumo-detalle-modal.html',
})
export class SolicitudInsumoDetalleModal {
  private solicitudService = inject(SolicitudInsumoService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('insumoCell', { static: true })
  insumoCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  /** null = cerrado. */
  solicitudId = input<number | null>(null);
  closed = output<void>();

  readonly LucideEye = LucideEye;

  columnas = computed<DsColumn[]>(() => [
    { key: 'insumoNombre', header: 'Insumo', cellTemplate: this.insumoCellTpl },
    { key: 'unidadMedidaMostrada', header: 'Unidad de medida', muted: true },
    {
      key: 'cantidadSolicitadaMostrada',
      header: 'Cantidad solicitada',
      numeric: true,
      strong: true,
    },
  ]);

  solicitud = signal<SolicitudInsumo | null>(null);
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
      insumoNombre: d.insumoNombre,
      sku: d.sku,
      unidadMedidaMostrada: d.unidadMedida,
      cantidadSolicitadaMostrada: `${d.cantidadSolicitada} ${d.unidadMedida}`,
    }));
  });

  estadoLabel(estado: EstadoSolicitudInsumo): string {
    return etiquetaEstadoSolicitudInsumo(estado);
  }

  estadoTone(estado: EstadoSolicitudInsumo): BadgeTone {
    return tonoEstadoSolicitudInsumo(estado);
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.solicitud.set(null);
    this.error.set(false);
    this.closed.emit();
  }

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
