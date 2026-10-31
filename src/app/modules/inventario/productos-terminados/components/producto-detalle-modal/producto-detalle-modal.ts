import {
  AfterViewInit,
  Component,
  DestroyRef,
  TemplateRef,
  Type,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowDownLeft,
  LucideArrowLeftRight,
  LucideArrowUpRight,
  LucideCalendarClock,
  LucideClock as LucideHistorial,
  LucideFileText,
  LucideLayers,
  LucidePackage,
  LucideTrendingDown,
  LucideTrendingUp,
} from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { EstadoLoteProductoTerminado } from '../../interfaces/lote-producto-terminado.interface';
import {
  MovimientoProductoTerminado,
  TipoMovimientoProductoTerminadoHistorial,
} from '../../interfaces/movimiento-producto-terminado.interface';
import {
  NivelStockProducto,
  ProductoPresentacion,
  calcularNivelStockProducto,
} from '../../interfaces/producto-presentacion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import { LoteProductoTerminadoService } from '../../services/lote-producto-terminado.service';
import { MovimientoProductoTerminadoService } from '../../services/movimiento-producto-terminado.service';

const SIN_DATO = '—';

const NIVEL_LABEL: Record<NivelStockProducto, string> = {
  normal: 'Normal',
  alto: 'Stock alto',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

const NIVEL_TONE: Record<NivelStockProducto, BadgeTone> = {
  normal: 'success',
  alto: 'info',
  bajo: 'warning',
  agotado: 'danger',
};

const ESTADO_LOTE_LABEL: Record<EstadoLoteProductoTerminado, string> = {
  activo: 'Activo',
  por_vencer: 'Por vencer',
  agotado: 'Agotado',
  vencido: 'Vencido',
};

const ESTADO_LOTE_TONE: Record<EstadoLoteProductoTerminado, BadgeTone> = {
  activo: 'success',
  por_vencer: 'warning',
  agotado: 'neutral',
  vencido: 'danger',
};

const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimientoProductoTerminadoHistorial, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
};

const TIPO_MOVIMIENTO_TONE: Record<TipoMovimientoProductoTerminadoHistorial, BadgeTone> = {
  entrada: 'success',
  salida: 'info',
  ajuste: 'warning',
};

const TIPO_MOVIMIENTO_ICON: Record<TipoMovimientoProductoTerminadoHistorial, Type<unknown>> = {
  entrada: LucideArrowDownLeft,
  salida: LucideArrowUpRight,
  ajuste: LucideArrowLeftRight,
};

// Duplica a proposito los fg de BadgeTone (badge.ts no los expone) — mismo
// criterio que InsumoDetalleModal.
const TONE_FG: Record<BadgeTone, string> = {
  neutral: '#5C5C5C',
  brand: '#D22B2B',
  success: '#2E7D32',
  warning: '#B35D00',
  danger: '#C62828',
  info: '#1565C0',
};

interface Campo {
  label: string;
  value: string;
}

interface FilaLote {
  codigoLote: string;
  fechaProduccionMostrada: string;
  fechaVencimientoMostrada: string;
  cantidadInicialMostrada: string;
  cantidadActualMostrada: string;
  estado: EstadoLoteProductoTerminado;
  // Baja logica administrativa del lote (distinta de "estado") — se usa
  // para no contar un lote dado de baja al calcular proximoVencimiento.
  activo: boolean;
  // null = sin fecha de vencimiento, o ya fuera del umbral de alerta.
  diasParaVencer: number | null;
}

interface FilaMovimiento {
  codigo: string;
  fechaMostrada: string;
  horaMostrada: string;
  tipo: TipoMovimientoProductoTerminadoHistorial;
  // Con el signo ya resuelto: positiva en entrada, negativa en salida, tal
  // cual viene (ya firmada) en ajuste.
  cantidad: number;
  cantidadMostrada: string;
  stockAnteriorMostrado: string;
  stockResultanteMostrado: string;
  loteCodigo: string;
}

// Mismo patron que InsumoDetalleModal (KPIs + tabs + grilla de campos,
// lotes/historial acotados a ESTE producto). Diferencias puntuales de
// producto terminado:
// - El catalogo usa "productoTerminadoId" (no el id de ProductoPresentacion)
//   para filtrar /lotes-producto-terminado y /movimientos-producto-terminado
//   — null en el caso rarisimo de que no se haya resuelto (ver el comentario
//   en ProductoTerminadoDto), y ahi se muestran las pestañas vacias sin
//   pedir nada al backend.
// - Sin sufijo de unidad en las cifras (producto terminado se cuenta en
//   unidades simples) y "Fecha de produccion" en vez de "Fecha de ingreso".
// - "Motivo" queda afuera de la tabla de movimientos a proposito (es el
//   detalle de UN producto) — mismo criterio que InsumoDetalleModal.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, KpiCard, Modal, Tabs],
  selector: 'app-producto-detalle-modal',
  templateUrl: './producto-detalle-modal.html',
})
export class ProductoDetalleModal implements AfterViewInit {
  private loteService = inject(LoteProductoTerminadoService);
  private movimientoService = inject(MovimientoProductoTerminadoService);
  private destroyRef = inject(DestroyRef);
  // Cancela la peticion de lotes anterior antes de lanzar una nueva — mismo
  // criterio que InsumoDetalleModal (evita que una respuesta vieja pise el
  // resultado de una mas fresca si el modal se reusa rapido para otro
  // producto).
  private lotesSub: Subscription | null = null;
  private movimientosSub: Subscription | null = null;
  // productoTerminadoId para el que ya se cargo (o esta cargando) el
  // historial — evita volver a pedirlo cada vez que se reentra a la pestaña
  // "historial".
  private movimientosCargadosPara = signal<number | null>(null);

  @ViewChild('vencimientoCell', { static: true })
  vencimientoCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

  @ViewChild('estadoLoteCell', { static: true })
  estadoLoteCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

  @ViewChild('codigoMovimientoCell', { static: true })
  codigoMovimientoCellTpl!: TemplateRef<{ $implicit: FilaMovimiento; index: number }>;

  @ViewChild('fechaMovimientoCell', { static: true })
  fechaMovimientoCellTpl!: TemplateRef<{ $implicit: FilaMovimiento; index: number }>;

  @ViewChild('tipoMovimientoCell', { static: true })
  tipoMovimientoCellTpl!: TemplateRef<{ $implicit: FilaMovimiento; index: number }>;

  @ViewChild('cantidadMovimientoCell', { static: true })
  cantidadMovimientoCellTpl!: TemplateRef<{ $implicit: FilaMovimiento; index: number }>;

  /** null = cerrado. */
  producto = input<ProductoPresentacion | null>(null);
  closed = output<void>();

  readonly LucideCalendarClock = LucideCalendarClock;
  readonly LucidePackage = LucidePackage;
  readonly LucideTrendingDown = LucideTrendingDown;
  readonly LucideTrendingUp = LucideTrendingUp;

  readonly tabs: DsTab[] = [
    { id: 'informacion', label: 'Información', icon: LucideFileText },
    { id: 'lotes', label: 'Lotes', icon: LucideLayers },
    { id: 'historial', label: 'Historial', icon: LucideHistorial },
  ];
  tabActiva = signal('informacion');

  columnasLotes = signal<DsColumn[]>([]);
  lotes = signal<FilaLote[]>([]);
  cargandoLotes = signal(false);
  errorLotes = signal(false);

  columnasMovimientos = signal<DsColumn[]>([]);
  movimientos = signal<FilaMovimiento[]>([]);
  cargandoMovimientos = signal(false);
  errorMovimientos = signal(false);

  constructor() {
    // Se carga apenas se abre el modal (ya no es perezoso por pestaña): la
    // tarjeta "Proximo vencimiento", visible en la pestaña "Informacion" (la
    // que se ve por defecto), tambien depende de estos datos — mismo
    // criterio que InsumoDetalleModal.
    effect(() => {
      const producto = this.producto();
      if (producto) {
        this.cargarLotes(producto);
      }
    });

    // El historial si es perezoso por pestaña (nada mas depende de el).
    effect(() => {
      const producto = this.producto();
      const esHistorial = this.tabActiva() === 'historial';
      if (
        producto?.productoTerminadoId != null &&
        esHistorial &&
        this.movimientosCargadosPara() !== producto.productoTerminadoId
      ) {
        this.cargarMovimientos(producto);
      }
    });
  }

  ngAfterViewInit(): void {
    this.columnasLotes.set([
      { key: 'codigoLote', header: 'Lote', strong: true },
      { key: 'fechaProduccionMostrada', header: 'Fecha de producción', muted: true },
      {
        key: 'fechaVencimientoMostrada',
        header: 'Vencimiento',
        cellTemplate: this.vencimientoCellTpl,
      },
      { key: 'cantidadInicialMostrada', header: 'Cantidad inicial', numeric: true, muted: true },
      { key: 'cantidadActualMostrada', header: 'Cantidad disponible', numeric: true },
      { key: 'estado', header: 'Estado', cellTemplate: this.estadoLoteCellTpl },
    ]);

    this.columnasMovimientos.set([
      // "Lote" va como secundario debajo del codigo (app-ds-cell-stack), no
      // como columna propia — mismo criterio que InsumoDetalleModal.
      { key: 'codigo', header: 'Código', cellTemplate: this.codigoMovimientoCellTpl },
      { key: 'fechaMostrada', header: 'Fecha y hora', cellTemplate: this.fechaMovimientoCellTpl },
      { key: 'tipo', header: 'Tipo', cellTemplate: this.tipoMovimientoCellTpl },
      {
        key: 'cantidadMostrada',
        header: 'Cantidad',
        cellTemplate: this.cantidadMovimientoCellTpl,
        numeric: true,
      },
      { key: 'stockAnteriorMostrado', header: 'Stock anterior', numeric: true, muted: true },
      { key: 'stockResultanteMostrado', header: 'Stock resultante', numeric: true },
    ]);
  }

  cargarLotes(producto: ProductoPresentacion): void {
    this.lotesSub?.unsubscribe();

    if (producto.productoTerminadoId == null) {
      this.lotes.set([]);
      this.errorLotes.set(false);
      return;
    }

    this.cargandoLotes.set(true);
    this.errorLotes.set(false);

    this.lotesSub = this.loteService
      .listar(1, 50, { productoTerminadoId: producto.productoTerminadoId })
      .pipe(
        finalize(() => this.cargandoLotes.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.lotes.set(
            pagina.lotes.map((lote) => ({
              codigoLote: lote.codigoLote,
              fechaProduccionMostrada: this.formatearFecha(lote.fechaProduccion),
              fechaVencimientoMostrada: lote.fechaVencimiento
                ? this.formatearFecha(lote.fechaVencimiento)
                : SIN_DATO,
              cantidadInicialMostrada: String(lote.cantidadInicial) + ' unid.',
              cantidadActualMostrada: String(lote.cantidadActual) + ' unid.',
              estado: lote.estado,
              activo: lote.activo,
              // "por_vencer" ya lo calcula el backend (activo y a 15 dias o
              // menos de vencer) — solo se usa aca para mostrar el conteo
              // exacto de dias junto a la fecha, no para decidir el estado.
              diasParaVencer:
                lote.estado === 'por_vencer' && lote.fechaVencimiento
                  ? this.diasHasta(lote.fechaVencimiento)
                  : null,
            })),
          );
        },
        error: () => {
          this.lotes.set([]);
          this.errorLotes.set(true);
        },
      });
  }

  cargarMovimientos(producto: ProductoPresentacion): void {
    this.movimientosSub?.unsubscribe();

    if (producto.productoTerminadoId == null) {
      this.movimientos.set([]);
      this.errorMovimientos.set(false);
      return;
    }

    this.cargandoMovimientos.set(true);
    this.errorMovimientos.set(false);
    const productoTerminadoId = producto.productoTerminadoId;

    this.movimientosSub = this.movimientoService
      .listar(1, 50, { productoTerminadoId })
      .pipe(
        finalize(() => this.cargandoMovimientos.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.movimientosCargadosPara.set(productoTerminadoId);
          this.movimientos.set(pagina.movimientos.map((m) => this.aFilaMovimiento(m)));
        },
        error: () => {
          this.movimientos.set([]);
          this.errorMovimientos.set(true);
        },
      });
  }

  private aFilaMovimiento(m: MovimientoProductoTerminado): FilaMovimiento {
    // entrada/salida: cantidad siempre positiva en el DTO, el signo lo da
    // "tipo". ajuste: ya viene firmada (+/-), se usa tal cual.
    const cantidad =
      m.tipo === 'ajuste' ? m.cantidad : m.tipo === 'salida' ? -m.cantidad : m.cantidad;
    const { fecha, hora } = this.formatearFechaHora(m.fecha);
    return {
      codigo: m.codigo,
      fechaMostrada: fecha,
      horaMostrada: hora,
      tipo: m.tipo,
      cantidad,
      cantidadMostrada: `${cantidad > 0 ? '+' : ''}${cantidad} unid.`,
      stockAnteriorMostrado: String(m.stockAnterior) + ' unid.',
      stockResultanteMostrado: String(m.stockResultante) + ' unid.',
      loteCodigo: m.codigoLote,
    };
  }

  tipoMovimientoLabel(tipo: TipoMovimientoProductoTerminadoHistorial): string {
    return TIPO_MOVIMIENTO_LABEL[tipo];
  }

  tipoMovimientoTone(tipo: TipoMovimientoProductoTerminadoHistorial): BadgeTone {
    return TIPO_MOVIMIENTO_TONE[tipo];
  }

  tipoMovimientoIcon(tipo: TipoMovimientoProductoTerminadoHistorial): Type<unknown> {
    return TIPO_MOVIMIENTO_ICON[tipo];
  }

  cantidadMovimientoColor(fila: FilaMovimiento): string {
    if (fila.tipo === 'ajuste') return TONE_FG[fila.cantidad >= 0 ? 'success' : 'danger'];
    return TONE_FG[this.tipoMovimientoTone(fila.tipo)];
  }

  estadoLoteLabel(estado: EstadoLoteProductoTerminado): string {
    return ESTADO_LOTE_LABEL[estado];
  }

  estadoLoteTone(estado: EstadoLoteProductoTerminado): BadgeTone {
    return ESTADO_LOTE_TONE[estado];
  }

  // Parseo manual (sin new Date(iso) a secas) para no arrastrar el desfase
  // de zona horaria que mete el parseo UTC de "YYYY-MM-DD" — mismo criterio
  // que InsumoDetalleModal.
  private diasHasta(fechaIso: string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000);
  }

  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(anio, mes - 1, dia));
  }

  // A diferencia de formatearFecha() (fechas "puras" YYYY-MM-DD), "fecha" de
  // un movimiento es un timestamptz real con hora — mismo criterio que
  // InsumoDetalleModal.
  private formatearFechaHora(fechaIso: string): { fecha: string; hora: string } {
    const fecha = new Date(fechaIso);
    return {
      fecha: new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(fecha),
      hora: new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(fecha),
    };
  }

  // Mismo criterio que InsumoDetalleModal.proximoVencimiento: GET
  // /lotes-producto-terminado?producto_terminado_id=X ya devuelve los
  // lotes ordenados por fecha_vencimiento ascendente (nulls al final) —
  // confirmado por el backend, mismo patron que lotes-insumo.
  proximoVencimiento = computed(() => {
    const primero = this.lotes().find(
      (lote) =>
        (lote.estado === 'activo' || lote.estado === 'por_vencer') &&
        lote.activo &&
        lote.fechaVencimientoMostrada !== SIN_DATO,
    );
    return primero?.fechaVencimientoMostrada ?? SIN_DATO;
  });

  nivel = computed<NivelStockProducto | null>(() => {
    const producto = this.producto();
    return producto ? calcularNivelStockProducto(producto) : null;
  });

  nivelLabel = computed(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_LABEL[nivel] : '';
  });

  nivelTone = computed<BadgeTone>(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_TONE[nivel] : 'neutral';
  });

  campos = computed<Campo[]>(() => {
    const producto = this.producto();
    if (!producto) return [];
    return [
      { label: 'SKU', value: producto.sku },
      { label: 'Nombre', value: producto.productoNombre },
      { label: 'Categoría', value: producto.categoriaNombre },
      {
        label: 'Presentación',
        value: etiquetaPresentacion(
          producto.presentacionCantidad,
          producto.presentacionUnidadMedida,
        ),
      },
      { label: 'Unidad de medida', value: producto.presentacionUnidadMedida },
      { label: 'Stock actual', value: String(producto.stockActual) + ' unid.' },
      { label: 'Stock mínimo', value: String(producto.stockMinimo) + ' unid.' },
      {
        label: 'Stock máximo',
        value: producto.stockMaximo !== null ? String(producto.stockMaximo) + ' unid.' : SIN_DATO,
      },
      { label: 'Nivel de stock', value: this.nivelLabel() },
      { label: 'Estado', value: producto.estado ? 'Activo' : 'Inactivo' },
      { label: 'Próximo vencimiento', value: this.proximoVencimiento() },
      { label: 'Descripción', value: producto.productoDescripcion || SIN_DATO },
    ];
  });

  cambiarTab(id: string): void {
    this.tabActiva.set(id);
  }

  cerrar(): void {
    this.lotesSub?.unsubscribe();
    this.movimientosSub?.unsubscribe();
    this.tabActiva.set('informacion');
    this.lotes.set([]);
    this.errorLotes.set(false);
    this.movimientos.set([]);
    this.errorMovimientos.set(false);
    this.movimientosCargadosPara.set(null);
    this.closed.emit();
  }
}
