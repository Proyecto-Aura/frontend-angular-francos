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
import { Subscription, finalize, forkJoin } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import {
  EstadoSolicitudProduccion,
  SolicitudProduccion,
} from '../../interfaces/solicitud-produccion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import {
  etiquetaEstadoSolicitud,
  tonoEstadoSolicitud,
} from '../../mappers/solicitud-produccion.mapper';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
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
  stockActualMostrado: string;
  // true cuando el stock disponible no alcanza lo solicitado — mismo
  // criterio visual que el mockup (stock en rojo).
  stockInsuficiente: boolean;
  cantidadSolicitada: number;
  cantidadSolicitadaMostrada: string;
}

// "Ver detalle" de una solicitud a produccion (OFT0-261), conectado a
// GET /solicitudes-produccion/:id (a diferencia del listado, SI trae el
// detalle embebido siempre). Pedido explicito del usuario: este modal SOLO
// tiene el boton "Cerrar" — "Editar" y el cambio de estado
// (PATCH .../estado) NO van aca, son flujos aparte que se abren desde la
// fila de la tabla.
//
// El stock actual por linea no viene en DetalleSolicitudProduccionDto (solo
// datos resueltos de producto/presentacion) — se resuelve uniendo contra el
// catalogo de /producto-presentaciones por productoTerminadoId, mismo
// patron que SolicitudProduccionFormModal.productoDeFila().
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Modal],
  selector: 'app-solicitud-detalle-modal',
  templateUrl: './solicitud-detalle-modal.html',
})
export class SolicitudDetalleModal implements AfterViewInit {
  private solicitudService = inject(SolicitudProduccionService);
  private productoService = inject(ProductoPresentacionService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  @ViewChild('stockCell', { static: true })
  stockCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  /** null = cerrado. */
  solicitudId = input<number | null>(null);
  closed = output<void>();

  readonly LucideEye = LucideEye;

  columnas = signal<DsColumn[]>([]);
  solicitud = signal<SolicitudProduccion | null>(null);
  productos = signal<ProductoPresentacion[]>([]);
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
      { key: 'stockActualMostrado', header: 'Stock actual', cellTemplate: this.stockCellTpl },
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

    this.cargaSub = forkJoin({
      solicitud: this.solicitudService.obtener(id),
      productos: this.productoService.listar(1, 100, { estado: true }),
    })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ solicitud, productos }) => {
          this.solicitud.set(solicitud);
          this.productos.set(productos.productos);
        },
        error: () => {
          this.solicitud.set(null);
          this.error.set(true);
        },
      });
  }

  reintentar(): void {
    const id = this.solicitudId();
    if (id !== null) {
      this.cargar(id);
    }
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
    return s.detalle.map((d) => {
      const producto = this.productos().find(
        (p) => p.productoTerminadoId === d.productoTerminadoId,
      );
      const stockActual = producto?.stockActual ?? null;
      return {
        id: d.id,
        productoNombre: d.productoNombre,
        sku: d.sku,
        presentacionMostrada: etiquetaPresentacion(
          d.presentacionCantidad,
          d.presentacionUnidadMedida,
        ),
        stockActualMostrado: stockActual !== null ? `${stockActual} unid.` : SIN_DATO,
        stockInsuficiente: stockActual !== null && stockActual < d.cantidadSolicitada,
        cantidadSolicitada: d.cantidadSolicitada,
        cantidadSolicitadaMostrada: `${d.cantidadSolicitada} unid.`,
      };
    });
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
    this.productos.set([]);
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

  // fecha_creacion puede venir como fecha pura (YYYY-MM-DD) o como timestamp
  // completo segun el caso (visto en ambos formatos en respuestas reales del
  // backend) — si es pura se parsea en hora local (mismo criterio que
  // formatearFecha) para no mostrar una hora falsa; si trae hora real se usa
  // tal cual, como pide el mockup ("12 Sep 2026 · 08:35").
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
