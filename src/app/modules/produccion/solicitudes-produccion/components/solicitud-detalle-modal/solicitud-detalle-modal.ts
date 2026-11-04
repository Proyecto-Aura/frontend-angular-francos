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
import { LucideEye, LucidePackageCheck } from '@lucide/angular';
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
  loteCreado: boolean;
  cantidadSolicitadaMostrada: string;
}

// "Ver detalle" de una solicitud a produccion, dentro del modulo Produccion
// (OFT0-263) — conectado a GET /solicitudes-produccion/:id (SI trae el
// detalle embebido siempre, a diferencia del listado). Solo lectura en
// modo="ver": el avance pendiente -> en_proceso ("Iniciar producción") y el
// rechazo viven en la fila de la tabla, no aca.
//
// modo="entregar" (OFT0-262, mismo patron que PedidoPrepararDetalleModal en
// Inventario: un unico componente con dos modos en vez de dos modales) es
// el unico caso en el que este modal SI avanza un estado — lo abre el
// icono de la fila cuando la solicitud ya esta "en_proceso". El boton
// "Registrar entrega" SOLO cambia el estado de la solicitud a "entregado"
// (PATCH .../estado) — a diferencia de "Marcar pendiente de entrega" en
// Pedidos, esto NO manda ningun movimiento de inventario (pedido explicito
// del usuario: la cantidad aca es estatica y no editable, Produccion ya
// fabrico, no se descuenta ni se agrega stock desde esta pantalla).
//
// A proposito NO se muestra "Stock actual" aca (se probo y se quito,
// pedido explicito del usuario): como un lote ya suma al stock apenas se
// crea (antes de "Registrar entrega"), mostrar el stock en vivo en este
// modal confundia — parecia que la entrega ya se habia aplicado cuando en
// realidad solo se estaba registrando la produccion.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Modal],
  selector: 'app-solicitud-detalle-modal',
  templateUrl: './solicitud-detalle-modal.html',
})
export class SolicitudDetalleModal {
  private solicitudService = inject(SolicitudProduccionService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  @ViewChild('loteCell', { static: true })
  loteCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  /** null = cerrado. */
  solicitudId = input<number | null>(null);
  // 'ver' (default) = solo lectura. 'entregar' = agrega el boton "Registrar
  // entrega" (solo lo usa el icono de la fila cuando la solicitud ya esta
  // "en_proceso").
  modo = input<'ver' | 'entregar'>('ver');
  closed = output<void>();
  // Se emite cuando "Registrar entrega" se aplica (o rebota en 409 y hay
  // que refrescar igual) — el listado vuelve a pedir pagina + indicadores.
  entregaRegistrada = output<void>();

  readonly LucideEye = LucideEye;

  headerIcon = computed(() => (this.modo() === 'entregar' ? LucidePackageCheck : LucideEye));

  solicitud = signal<SolicitudProduccion | null>(null);
  cargando = signal(false);
  error = signal(false);
  registrando = signal(false);
  errorEntrega = signal('');

  constructor() {
    effect(() => {
      const id = this.solicitudId();
      if (id !== null) {
        this.cargar(id);
      }
    });
  }

  columnas = computed<DsColumn[]>(() => [
    { key: 'productoNombre', header: 'Producto', cellTemplate: this.productoCellTpl },
    { key: 'presentacionMostrada', header: 'Presentación', muted: true },
    {
      key: 'cantidadSolicitadaMostrada',
      header: 'Cantidad solicitada',
      numeric: true,
      strong: true,
    },
    { key: 'loteCreado', header: 'Lote', cellTemplate: this.loteCellTpl },
  ]);

  // Bloquea "Registrar entrega" mientras falte algun lote por registrar —
  // el backend tambien lo valida con 409 "Faltan lotes por registrar...",
  // esto solo evita dejar que se intente el click (OFT0-262).
  faltanLotes = computed(() => this.solicitud()?.detalle.some((d) => !d.loteCreado) ?? false);

  cargar(id: number): void {
    this.cargaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set(false);
    this.errorEntrega.set('');

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
      loteCreado: d.loteCreado,
      cantidadSolicitadaMostrada: `${d.cantidadSolicitada} unid.`,
    }));
  });

  estadoLabel(estado: EstadoSolicitudProduccion): string {
    return etiquetaEstadoSolicitud(estado);
  }

  estadoTone(estado: EstadoSolicitudProduccion): BadgeTone {
    return tonoEstadoSolicitud(estado);
  }

  // Unico flujo que hace PATCH desde este modal: "entregar" siempre
  // representa la solicitud en "en_proceso" (lo garantiza la fila que abre
  // este modo), asi que esto siempre es el PATCH .../estado hacia
  // "entregado" — "Iniciar producción" (pendiente -> en_proceso) sigue
  // siendo un PATCH directo desde la fila, sin este modal.
  registrarEntrega(): void {
    const s = this.solicitud();
    if (
      !s ||
      this.modo() !== 'entregar' ||
      this.registrando() ||
      this.cargando() ||
      this.error() ||
      this.faltanLotes()
    ) {
      return;
    }

    this.registrando.set(true);
    this.errorEntrega.set('');

    this.solicitudService
      .cambiarEstado(s.id, 'entregado')
      .pipe(
        finalize(() => this.registrando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.entregaRegistrada.emit();
          this.cerrar();
        },
        error: (error: unknown) => {
          const status = (error as { status?: number }).status;
          if (status === 409) {
            this.entregaRegistrada.emit();
            this.cerrar();
            return;
          }
          this.errorEntrega.set('No se pudo registrar la entrega. Intenta nuevamente.');
        },
      });
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.solicitud.set(null);
    this.error.set(false);
    this.errorEntrega.set('');
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
