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
  LucideCircleAlert,
  LucideCircleCheck,
  LucideClock,
  LucideEye,
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
import {
  Insumo,
  NivelStock,
  TipoInsumo,
  calcularNivelStock,
} from '../../interfaces/insumo.interface';
import { EstadoLote } from '../../interfaces/lote-insumo.interface';
import {
  MovimientoInsumo,
  TipoMovimientoInsumoHistorial,
} from '../../interfaces/movimiento-insumo.interface';
import { LoteInsumoService } from '../../services/lote-insumo.service';
import { MovimientoInsumoService } from '../../services/movimiento-insumo.service';

const SIN_DATO = '—';

const TIPO_LABEL: Record<TipoInsumo, string> = {
  materia_prima: 'Materia prima',
  empaque: 'Empaque',
};

const NIVEL_LABEL: Record<NivelStock, string> = {
  normal: 'Normal',
  alto: 'Stock alto',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

const NIVEL_TONE: Record<NivelStock, BadgeTone> = {
  normal: 'success',
  alto: 'info',
  bajo: 'warning',
  agotado: 'danger',
};

const NIVEL_ICON: Record<NivelStock, Type<unknown>> = {
  normal: LucideCircleCheck,
  alto: LucideTrendingUp,
  bajo: LucideTrendingDown,
  agotado: LucideCircleAlert,
};

const ESTADO_LOTE_LABEL: Record<EstadoLote, string> = {
  activo: 'Activo',
  por_vencer: 'Por vencer',
  agotado: 'Agotado',
  vencido: 'Vencido',
};

const ESTADO_LOTE_TONE: Record<EstadoLote, BadgeTone> = {
  activo: 'success',
  por_vencer: 'warning',
  agotado: 'neutral',
  vencido: 'danger',
};

const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimientoInsumoHistorial, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
};

const TIPO_MOVIMIENTO_TONE: Record<TipoMovimientoInsumoHistorial, BadgeTone> = {
  entrada: 'success',
  salida: 'info',
  ajuste: 'warning',
};

const TIPO_MOVIMIENTO_ICON: Record<TipoMovimientoInsumoHistorial, Type<unknown>> = {
  entrada: LucideArrowDownLeft,
  salida: LucideArrowUpRight,
  ajuste: LucideArrowLeftRight,
};

// Duplica a proposito los fg de BadgeTone (badge.ts no los expone) — es el
// color del texto de la celda "Cantidad", que no usa <app-ds-badge> (en el
// diseño va sin fondo, solo texto en color).
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
  fechaIngresoMostrada: string;
  fechaVencimientoMostrada: string;
  cantidadInicialMostrada: string;
  cantidadActualMostrada: string;
  estado: EstadoLote;
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
  tipo: TipoMovimientoInsumoHistorial;
  // Con el signo ya resuelto: positiva en entrada, negativa en salida, tal
  // cual viene (ya firmada) en ajuste.
  cantidad: number;
  cantidadMostrada: string;
  stockAnteriorMostrado: string;
  stockResultanteMostrado: string;
  razon: string;
  loteCodigo: string;
}

@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, KpiCard, Modal, Tabs],
  selector: 'app-insumo-detalle-modal',
  templateUrl: './insumo-detalle-modal.html',
})
export class InsumoDetalleModal implements AfterViewInit {
  private loteService = inject(LoteInsumoService);
  private movimientoService = inject(MovimientoInsumoService);
  private destroyRef = inject(DestroyRef);
  // Cancela la peticion de lotes anterior antes de lanzar una nueva: sin
  // esto, si la pestaña se abre/cierra rapido (o se vuelve a pedir para
  // otro insumo), dos requests quedan en vuelo a la vez y la que termine
  // ultima — sin importar si es la mas vieja — pisa el resultado de la
  // otra. Vimos exactamente eso: una respuesta vieja en cache (304, vacia)
  // llegando despues que la fresca con datos reales.
  private lotesSub: Subscription | null = null;
  private movimientosSub: Subscription | null = null;
  // Insumo.id para el que ya se cargo (o esta cargando) el historial — evita
  // volver a pedirlo cada vez que se reentra a la pestaña "historial".
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
  insumo = input<Insumo | null>(null);
  closed = output<void>();

  readonly LucideCalendarClock = LucideCalendarClock;
  readonly LucideEye = LucideEye;
  readonly LucidePackage = LucidePackage;
  readonly LucideTrendingDown = LucideTrendingDown;
  readonly LucideTrendingUp = LucideTrendingUp;

  readonly tabs: DsTab[] = [
    { id: 'informacion', label: 'Información', icon: LucideFileText },
    { id: 'lotes', label: 'Lotes', icon: LucideLayers },
    { id: 'historial', label: 'Historial de movimientos', icon: LucideClock },
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
    // tarjeta "Proximo vencimiento", visible en la pestaña "Informacion"
    // (la que se ve por defecto), tambien depende de estos datos, asi que
    // no alcanza con pedirlos recien al entrar a la pestaña "Lotes".
    effect(() => {
      const insumo = this.insumo();
      if (insumo) {
        this.cargarLotes(insumo);
      }
    });

    // El historial si es perezoso por pestaña (nada mas depende de el) —
    // pero tambien reacciona si el insumo cambia mientras el modal ya esta
    // abierto en la pestaña "historial" (se reusa el modal para otro
    // insumo sin pasar por cerrar()).
    effect(() => {
      const insumo = this.insumo();
      const esHistorial = this.tabActiva() === 'historial';
      if (insumo && esHistorial && this.movimientosCargadosPara() !== insumo.id) {
        this.cargarMovimientos(insumo);
      }
    });
  }

  ngAfterViewInit(): void {
    this.columnasLotes.set([
      { key: 'codigoLote', header: 'Lote' },
      { key: 'fechaIngresoMostrada', header: 'Fecha de ingreso', muted: true },
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
      // como columna propia — asi entran todas sin scroll horizontal. Y
      // "Motivo" queda afuera de esta tabla a proposito (es la del detalle
      // de UN insumo): va a ir en la tabla general de movimientos, donde si
      // tiene sentido como columna propia.
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

  cargarLotes(insumo: Insumo): void {
    this.lotesSub?.unsubscribe();
    this.cargandoLotes.set(true);
    this.errorLotes.set(false);

    this.lotesSub = this.loteService
      .listar(1, 50, { insumoId: insumo.id })
      .pipe(
        finalize(() => this.cargandoLotes.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.lotes.set(
            pagina.lotes.map((lote) => ({
              codigoLote: lote.codigoLote,
              fechaIngresoMostrada: this.formatearFecha(lote.fechaIngreso),
              fechaVencimientoMostrada: lote.fechaVencimiento
                ? this.formatearFecha(lote.fechaVencimiento)
                : SIN_DATO,
              cantidadInicialMostrada: `${lote.cantidadInicial} ${insumo.unidadMedida}`,
              cantidadActualMostrada: `${lote.cantidadActual} ${insumo.unidadMedida}`,
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

  cargarMovimientos(insumo: Insumo): void {
    this.movimientosSub?.unsubscribe();
    this.cargandoMovimientos.set(true);
    this.errorMovimientos.set(false);

    this.movimientosSub = this.movimientoService
      .listar(1, 50, { insumoId: insumo.id })
      .pipe(
        finalize(() => this.cargandoMovimientos.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.movimientosCargadosPara.set(insumo.id);
          this.movimientos.set(pagina.movimientos.map((m) => this.aFilaMovimiento(m, insumo)));
        },
        error: () => {
          this.movimientos.set([]);
          this.errorMovimientos.set(true);
        },
      });
  }

  private aFilaMovimiento(m: MovimientoInsumo, insumo: Insumo): FilaMovimiento {
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
      cantidadMostrada: `${cantidad > 0 ? '+' : ''}${cantidad} ${insumo.unidadMedida}`,
      stockAnteriorMostrado: `${m.stockAnterior} ${insumo.unidadMedida}`,
      stockResultanteMostrado: `${m.stockResultante} ${insumo.unidadMedida}`,
      razon: m.razon || SIN_DATO,
      loteCodigo: m.codigoLote,
    };
  }

  tipoMovimientoLabel(tipo: TipoMovimientoInsumoHistorial): string {
    return TIPO_MOVIMIENTO_LABEL[tipo];
  }

  tipoMovimientoTone(tipo: TipoMovimientoInsumoHistorial): BadgeTone {
    return TIPO_MOVIMIENTO_TONE[tipo];
  }

  tipoMovimientoIcon(tipo: TipoMovimientoInsumoHistorial): Type<unknown> {
    return TIPO_MOVIMIENTO_ICON[tipo];
  }

  cantidadMovimientoColor(fila: FilaMovimiento): string {
    // entrada/salida: color fijo por tipo. ajuste: por signo (negativo
    // llama mas la atencion que un simple "info", ya que es una correccion
    // manual de stock).
    if (fila.tipo === 'ajuste') return TONE_FG[fila.cantidad >= 0 ? 'success' : 'danger'];
    return TONE_FG[this.tipoMovimientoTone(fila.tipo)];
  }

  estadoLoteLabel(estado: EstadoLote): string {
    return ESTADO_LOTE_LABEL[estado];
  }

  estadoLoteTone(estado: EstadoLote): BadgeTone {
    return ESTADO_LOTE_TONE[estado];
  }

  // Parseo manual (sin new Date(iso) a secas) para no arrastrar el desfase
  // de zona horaria que mete el parseo UTC de "YYYY-MM-DD". slice(0, 10)
  // porque el backend a veces manda la fecha pelada ("2026-10-17") y a
  // veces como datetime completo ("2026-10-17T00:00:00.000Z") — en ambos
  // casos los primeros 10 caracteres son el "YYYY-MM-DD" que nos importa.
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

  // A diferencia de formatearFecha() (fechas "puras" YYYY-MM-DD, donde el
  // parseo manual evita el desfase de zona horaria), "fecha" de un
  // movimiento es un timestamptz real con hora — aca si conviene dejar que
  // Date lo parsee tal cual, para que la hora se muestre en la zona local.
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

  // GET /lotes-insumo?insumo_id=X ya devuelve los lotes ordenados por
  // fecha_vencimiento ascendente (nulls al final) — confirmado con el
  // backend. Por eso alcanza con tomar el primero que siga vigente: estado
  // "activo" o "por_vencer" (ambos son stock utilizable, solo cambia que tan
  // cerca esta de vencer), no dado de baja (activo logico) y con fecha real
  // (no null, que es el caso de los insumos tipo empaque, que no vencen).
  proximoVencimiento = computed(() => {
    const primero = this.lotes().find(
      (lote) =>
        (lote.estado === 'activo' || lote.estado === 'por_vencer') &&
        lote.activo &&
        lote.fechaVencimientoMostrada !== SIN_DATO,
    );
    return primero?.fechaVencimientoMostrada ?? SIN_DATO;
  });

  nivel = computed<NivelStock | null>(() => {
    const insumo = this.insumo();
    return insumo ? calcularNivelStock(insumo) : null;
  });

  nivelLabel = computed(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_LABEL[nivel] : '';
  });

  nivelTone = computed<BadgeTone>(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_TONE[nivel] : 'neutral';
  });

  nivelIcon = computed(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_ICON[nivel] : LucideCircleCheck;
  });

  campos = computed<Campo[]>(() => {
    const insumo = this.insumo();
    if (!insumo) return [];
    return [
      { label: 'SKU', value: insumo.sku },
      { label: 'Nombre', value: insumo.nombre },
      { label: 'Tipo', value: TIPO_LABEL[insumo.tipo] },
      { label: 'Unidad de medida', value: insumo.unidadMedida },
      { label: 'Stock actual', value: `${insumo.stockActual} ${insumo.unidadMedida}` },
      { label: 'Stock mínimo', value: `${insumo.stockMinimo} ${insumo.unidadMedida}` },
      { label: 'Stock máximo', value: `${insumo.stockMaximo} ${insumo.unidadMedida}` },
      { label: 'Nivel de stock', value: this.nivelLabel() },
      { label: 'Estado', value: insumo.estado ? 'Activo' : 'Inactivo' },
      { label: 'Próximo vencimiento', value: this.proximoVencimiento() },
      { label: 'Descripción', value: insumo.descripcion || SIN_DATO },
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
