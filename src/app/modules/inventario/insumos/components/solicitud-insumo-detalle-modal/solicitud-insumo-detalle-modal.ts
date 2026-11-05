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
import { Subscription, finalize, forkJoin } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Input } from '../../../../../shared/ds/input/input';
import { Insumo } from '../../interfaces/insumo.interface';
import {
  EstadoSolicitudInsumo,
  SolicitudInsumo,
} from '../../interfaces/solicitud-insumo.interface';
import {
  etiquetaEstadoSolicitudInsumo,
  tonoEstadoSolicitudInsumo,
} from '../../mappers/solicitud-insumo.mapper';
import { InsumoService } from '../../services/insumo.service';
import { SolicitudInsumoService } from '../../services/solicitud-insumo.service';

const SIN_DATO = '—';

interface Campo {
  label: string;
  value: string;
}

interface FilaDetalle {
  id: number;
  insumoId: number;
  insumoNombre: string;
  sku: string;
  unidadMedida: string;
  stockActualMostrado: string;
  cantidadSolicitadaMostrada: string;
  cantidadPreparada: number;
}

// "Ver detalle" de una solicitud de insumos, dentro del modulo Inventario
// (OFT0-264, lado "cumplir" de produccion/solicitudes-insumos) — conectado a
// GET /produccion/solicitudes-insumos/:id (SI trae el detalle embebido
// siempre, a diferencia del listado). Solo lectura en modo="ver": el avance
// pendiente -> en_proceso ("Iniciar entrega") vive en la fila de la tabla,
// no aca.
//
// modo="entregar" (mismo patron que el modal homonimo de solicitud de
// produccion, y que PedidoPrepararDetalleModal de Pedidos: un unico
// componente con dos modos en vez de dos modales) es el unico caso en el
// que este modal SI avanza un estado — lo abre el icono de la fila cuando
// la solicitud ya esta "en_proceso". A diferencia de solicitud de
// produccion (que no mueve stock al entregar), aca "Registrar entrega" SI
// dispara una salida real de cada insumo del lado del backend (descuento
// FEFO, todo o nada): por eso se muestra "Stock actual" por linea (util
// para anticipar si va a alcanzar) y un 409 NO se trata como "ya se
// resolvio, solo refrescar" (como el "faltan lotes" de produccion) — es un
// error real que la persona tiene que ver y resolver (no hay stock
// suficiente).
//
// "Cantidad preparada" (pedido explicito del usuario, mismo UX que "Marcar
// pendiente de entrega" en Pedidos por preparar) es editable solo en
// modo="entregar": arranca prellenada con la cantidad solicitada de cada
// linea y la persona la ajusta si prepara de mas/menos. Al confirmar se
// manda el array completo de items (confirmado por el backend: si se
// manda, tiene que cubrir EXACTAMENTE las lineas del detalle o tira 400).
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Input, Modal],
  selector: 'app-solicitud-insumo-detalle-modal',
  templateUrl: './solicitud-insumo-detalle-modal.html',
})
export class SolicitudInsumoDetalleModal {
  private solicitudService = inject(SolicitudInsumoService);
  private insumoService = inject(InsumoService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('insumoCell', { static: true })
  insumoCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  @ViewChild('cantidadPreparadaCell', { static: true })
  cantidadPreparadaCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  /** null = cerrado. */
  solicitudId = input<number | null>(null);
  // 'ver' (default) = solo lectura. 'entregar' = agrega el boton "Registrar
  // entrega" (solo lo usa el icono de la fila cuando la solicitud ya esta
  // "en_proceso").
  modo = input<'ver' | 'entregar'>('ver');
  closed = output<void>();
  // Se emite cuando "Registrar entrega" se aplica — el listado vuelve a
  // pedir pagina + indicadores.
  entregaRegistrada = output<void>();

  readonly LucideEye = LucideEye;

  headerIcon = computed(() => (this.modo() === 'entregar' ? LucidePackageCheck : LucideEye));

  solicitud = signal<SolicitudInsumo | null>(null);
  insumos = signal<Insumo[]>([]);
  cargando = signal(false);
  error = signal(false);
  registrando = signal(false);
  errorEntrega = signal('');

  // Cantidad preparada editable por linea de detalle, keyed por detalleId —
  // se resincroniza con "cantidad solicitada" cada vez que se carga una
  // solicitud nueva (ver sincronizarCantidadesPreparadas), mismo patron que
  // PedidoPrepararDetalleModal.
  private cantidadesPreparadas = signal<Map<number, number>>(new Map());

  constructor() {
    effect(() => {
      const id = this.solicitudId();
      if (id !== null) {
        this.cargar(id);
      }
    });
  }

  columnas = computed<DsColumn[]>(() => {
    const columnas: DsColumn[] = [
      { key: 'insumoNombre', header: 'Insumo', cellTemplate: this.insumoCellTpl },
      { key: 'unidadMedida', header: 'Unidad de medida', muted: true },
      { key: 'stockActualMostrado', header: 'Stock actual', muted: true },
      {
        key: 'cantidadSolicitadaMostrada',
        header: 'Cantidad solicitada',
        numeric: true,
        strong: true,
      },
    ];
    if (this.modo() === 'entregar') {
      columnas.push({
        key: 'cantidadPreparada',
        header: 'Cantidad preparada',
        numeric: true,
        cellTemplate: this.cantidadPreparadaCellTpl,
      });
    }
    return columnas;
  });

  cargar(id: number): void {
    this.cargaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set(false);
    this.errorEntrega.set('');

    this.cargaSub = forkJoin({
      solicitud: this.solicitudService.obtener(id),
      insumos: this.insumoService.listar(1, 100, { estado: true }),
    })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ solicitud, insumos }) => {
          this.solicitud.set(solicitud);
          this.insumos.set(insumos.insumos);
          this.sincronizarCantidadesPreparadas(solicitud);
        },
        error: () => {
          this.solicitud.set(null);
          this.error.set(true);
        },
      });
  }

  private sincronizarCantidadesPreparadas(solicitud: SolicitudInsumo): void {
    this.cantidadesPreparadas.set(
      new Map(solicitud.detalle.map((d) => [d.id, d.cantidadSolicitada])),
    );
  }

  actualizarCantidadPreparada(detalleId: number, valor: string): void {
    const cantidad = Math.max(0, Number(valor) || 0);
    this.cantidadesPreparadas.update((actual) => {
      const copia = new Map(actual);
      copia.set(detalleId, cantidad);
      return copia;
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
    const cantidades = this.cantidadesPreparadas();
    return s.detalle.map((d) => {
      const insumo = this.insumos().find((i) => i.id === d.insumoId);
      const stockActual = insumo?.stockActual ?? null;
      return {
        id: d.id,
        insumoId: d.insumoId,
        insumoNombre: d.insumoNombre,
        sku: d.sku,
        unidadMedida: d.unidadMedida,
        stockActualMostrado: stockActual !== null ? `${stockActual} ${d.unidadMedida}` : SIN_DATO,
        cantidadSolicitadaMostrada: `${d.cantidadSolicitada} ${d.unidadMedida}`,
        cantidadPreparada: cantidades.get(d.id) ?? d.cantidadSolicitada,
      };
    });
  });

  textoAyuda = computed(() => {
    if (this.modo() !== 'entregar') return null;
    return 'Ajusta la cantidad preparada si es distinta a la solicitada. Al confirmar se registrará la salida de inventario.';
  });

  estadoLabel(estado: EstadoSolicitudInsumo): string {
    return etiquetaEstadoSolicitudInsumo(estado);
  }

  estadoTone(estado: EstadoSolicitudInsumo): BadgeTone {
    return tonoEstadoSolicitudInsumo(estado);
  }

  // Unico flujo que hace PATCH desde este modal: "entregar" siempre
  // representa la solicitud en "en_proceso" (lo garantiza la fila que abre
  // este modo), asi que esto siempre es el PATCH .../estado hacia
  // "entregado" — "Iniciar entrega" (pendiente -> en_proceso) sigue siendo
  // un PATCH directo desde la fila, sin este modal. Siempre manda el array
  // completo de items (una linea por cada una del detalle, con la cantidad
  // preparada que haya quedado editada o la solicitada por defecto) — el
  // backend exige que cubra exactamente las lineas del detalle.
  registrarEntrega(): void {
    const s = this.solicitud();
    if (!s || this.modo() !== 'entregar' || this.registrando() || this.cargando() || this.error()) {
      return;
    }

    this.registrando.set(true);
    this.errorEntrega.set('');

    const cantidades = this.cantidadesPreparadas();
    const items = s.detalle.map((d) => ({
      insumoId: d.insumoId,
      cantidadEntregada: cantidades.get(d.id) ?? d.cantidadSolicitada,
    }));

    this.solicitudService
      .cambiarEstado(s.id, 'entregado', items)
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
            this.errorEntrega.set(
              'No hay stock suficiente para entregar uno o más insumos de esta solicitud.',
            );
            return;
          }
          if (status === 400) {
            this.errorEntrega.set(
              'Las cantidades entregadas no coinciden con las líneas del detalle.',
            );
            return;
          }
          this.errorEntrega.set('No se pudo registrar la entrega. Intenta nuevamente.');
        },
      });
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.solicitud.set(null);
    this.insumos.set([]);
    this.cantidadesPreparadas.set(new Map());
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
