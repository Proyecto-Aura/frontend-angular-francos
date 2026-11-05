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
import { Input } from '../../../../../shared/ds/input/input';
import {
  EstadoSolicitudInsumo,
  SolicitudInsumo,
} from '../../interfaces/solicitud-insumo.interface';
import {
  etiquetaDisponibilidadSolicitudInsumo,
  etiquetaEstadoSolicitudInsumo,
  tonoDisponibilidadSolicitudInsumo,
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
  insumoId: number;
  insumoNombre: string;
  sku: string;
  unidadMedida: string;
  stockDisponible: number | null;
  stockDisponibleMostrado: string;
  cantidadSolicitada: number;
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
// FEFO, todo o nada), y un 409 NO se trata como "ya se resolvio, solo
// refrescar" (como el "faltan lotes" de produccion) — es un error real que
// la persona tiene que ver y resolver (no hay stock suficiente).
//
// "stock_disponible" por linea y "disponibilidad" a nivel solicitud
// (OFT0-257, pedido explicito del usuario: mismo UX que "Pedidos por
// preparar") vienen YA CALCULADOS por el backend en el GET :id — no se
// resuelven aparte contra el catalogo de /insumos (asi se evita el join
// redundante que el backend senalo para Lotes/Solicitudes de produccion).
// En modo="ver" el stock de cada linea se muestra con un badge binario
// (completo/insuficiente, igual que Pedidos); en modo="entregar" se muestra
// en texto plano junto a "Cantidad preparada" (editable, prellenada con lo
// solicitado) — mismo criterio que PedidoPrepararDetalleModal: el badge por
// linea no se repite ahi porque ya se ve el numero editable al lado.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Input, Modal],
  selector: 'app-solicitud-insumo-detalle-modal',
  templateUrl: './solicitud-insumo-detalle-modal.html',
})
export class SolicitudInsumoDetalleModal {
  private solicitudService = inject(SolicitudInsumoService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('insumoCell', { static: true })
  insumoCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

  @ViewChild('stockDisponibleCell', { static: true })
  stockDisponibleCellTpl!: TemplateRef<{ $implicit: FilaDetalle; index: number }>;

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

  // Una vez "entregado" ya se aplico el descuento de stock: la tabla se
  // queda sin ninguna columna de stock (ni badge ni texto), pedido
  // explicito del usuario — mismo criterio que PedidoPrepararDetalleModal
  // una vez "pendiente_entrega" (mostrar el stock ahi ya no informa nada
  // util sobre ESTA solicitud, y puede confundir con el stock actual, que
  // ya cambio por otros movimientos).
  solicitudEntregada = computed(() => this.solicitud()?.estado === 'entregado');

  columnas = computed<DsColumn[]>(() => {
    const columnas: DsColumn[] = [
      { key: 'insumoNombre', header: 'Insumo', cellTemplate: this.insumoCellTpl },
      { key: 'unidadMedida', header: 'Unidad de medida', muted: true },
      {
        key: 'cantidadSolicitadaMostrada',
        header: 'Cantidad solicitada',
        numeric: true,
        strong: true,
      },
    ];
    if (this.modo() === 'entregar') {
      columnas.push(
        { key: 'stockDisponibleMostrado', header: 'Stock disponible', muted: true },
        {
          key: 'cantidadPreparada',
          header: 'Cantidad preparada',
          numeric: true,
          cellTemplate: this.cantidadPreparadaCellTpl,
        },
      );
    } else if (!this.solicitudEntregada()) {
      columnas.push({
        key: 'stockDisponible',
        header: 'Stock disponible',
        cellTemplate: this.stockDisponibleCellTpl,
      });
    }
    return columnas;
  });

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
        next: (solicitud) => {
          this.solicitud.set(solicitud);
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

  // "Disponibilidad" vive aparte de campos() (no es texto plano, es un
  // badge de 3 tonos) — ausente si la solicitud ya esta "entregado" (el
  // stock que importaba ya se desconto, mostrarla ahi confundiria, mismo
  // criterio que "Stock actual" en PedidoPrepararDetalleModal una vez
  // "pendiente_entrega").
  mostrarDisponibilidad = computed(() => {
    const s = this.solicitud();
    return Boolean(s && s.estado !== 'entregado' && s.disponibilidad);
  });

  disponibilidadLabel = computed(() => {
    const d = this.solicitud()?.disponibilidad;
    return d ? etiquetaDisponibilidadSolicitudInsumo(d) : '';
  });

  disponibilidadTono = computed<BadgeTone>(() => {
    const d = this.solicitud()?.disponibilidad;
    return d ? tonoDisponibilidadSolicitudInsumo(d) : 'neutral';
  });

  filas = computed<FilaDetalle[]>(() => {
    const s = this.solicitud();
    if (!s) return [];
    const cantidades = this.cantidadesPreparadas();
    return s.detalle.map((d) => ({
      id: d.id,
      insumoId: d.insumoId,
      insumoNombre: d.insumoNombre,
      sku: d.sku,
      unidadMedida: d.unidadMedida,
      stockDisponible: d.stockDisponible,
      stockDisponibleMostrado:
        d.stockDisponible !== null ? `${d.stockDisponible} ${d.unidadMedida}` : SIN_DATO,
      cantidadSolicitada: d.cantidadSolicitada,
      cantidadSolicitadaMostrada: `${d.cantidadSolicitada} ${d.unidadMedida}`,
      cantidadPreparada: cantidades.get(d.id) ?? d.cantidadSolicitada,
    }));
  });

  // Bloquea "Registrar entrega" si la disponibilidad no es "completo"
  // (pedido explicito del usuario, mismo criterio que entregaBloqueada en
  // PedidoPrepararDetalleModal): puede haber mas de una solicitud
  // "en_proceso" a la vez sobre el mismo insumo, y si una ya se entrego
  // primero el stock restante puede no alcanzar para esta — mejor frenar
  // aca que dejar que tire 409 despues de que la persona ya ajusto
  // cantidades.
  entregaBloqueada = computed(() => this.solicitud()?.disponibilidad !== 'completo');

  textoAyuda = computed(() => {
    if (this.modo() !== 'entregar') return null;
    if (this.entregaBloqueada()) {
      return 'No se puede registrar la entrega: falta stock para completar la solicitud.';
    }
    return 'Ajusta la cantidad preparada si es distinta a la solicitada. Al confirmar se registrará la salida de inventario.';
  });

  estadoLabel(estado: EstadoSolicitudInsumo): string {
    return etiquetaEstadoSolicitudInsumo(estado);
  }

  estadoTone(estado: EstadoSolicitudInsumo): BadgeTone {
    return tonoEstadoSolicitudInsumo(estado);
  }

  // Badge binario por fila (modo="ver") — a diferencia de "disponibilidad"
  // de la solicitud completa (completo/parcial/sin_stock), una sola
  // linea/insumo siempre alcanza o no alcanza, no existe un "parcial" por
  // item. Si stockDisponible es null (el backend no lo mando, caso
  // inesperado) se trata como insuficiente, nunca como completo.
  private filaSinStockSuficiente(fila: FilaDetalle): boolean {
    return fila.stockDisponible === null || fila.stockDisponible < fila.cantidadSolicitada;
  }

  disponibilidadFilaEstado(fila: FilaDetalle): string {
    return this.filaSinStockSuficiente(fila) ? 'Stock insuficiente' : 'Stock completo';
  }

  disponibilidadFilaTono(fila: FilaDetalle): BadgeTone {
    return this.filaSinStockSuficiente(fila) ? 'danger' : 'success';
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
    if (
      !s ||
      this.modo() !== 'entregar' ||
      this.registrando() ||
      this.cargando() ||
      this.error() ||
      this.entregaBloqueada()
    ) {
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
