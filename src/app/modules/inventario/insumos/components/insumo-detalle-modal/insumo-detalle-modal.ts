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
import { LoteInsumoService } from '../../services/lote-insumo.service';

// Pestaña "Historial de movimientos" queda como estructura lista pero sin
// datos (placeholder, sin contador) — ese modulo todavia no existe en el
// backend. "Lotes" y "Proximo vencimiento" si tienen datos reales (ver
// cargarLotes() y proximoVencimiento mas abajo).
const SIN_DATO = '—';
// Umbral para la alerta "Vence en N días" en la pestaña Lotes.
const DIAS_ALERTA_VENCIMIENTO = 10;

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
  agotado: 'Agotado',
  vencido: 'Vencido',
};

const ESTADO_LOTE_TONE: Record<EstadoLote, BadgeTone> = {
  activo: 'success',
  agotado: 'neutral',
  vencido: 'danger',
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

@Component({
  imports: [Badge, Button, Card, DataTable, Icon, KpiCard, Modal, Tabs],
  selector: 'app-insumo-detalle-modal',
  templateUrl: './insumo-detalle-modal.html',
})
export class InsumoDetalleModal implements AfterViewInit {
  private loteService = inject(LoteInsumoService);
  private destroyRef = inject(DestroyRef);
  // Cancela la peticion de lotes anterior antes de lanzar una nueva: sin
  // esto, si la pestaña se abre/cierra rapido (o se vuelve a pedir para
  // otro insumo), dos requests quedan en vuelo a la vez y la que termine
  // ultima — sin importar si es la mas vieja — pisa el resultado de la
  // otra. Vimos exactamente eso: una respuesta vieja en cache (304, vacia)
  // llegando despues que la fresca con datos reales.
  private lotesSub: Subscription | null = null;

  @ViewChild('vencimientoCell', { static: true })
  vencimientoCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

  @ViewChild('estadoLoteCell', { static: true })
  estadoLoteCellTpl!: TemplateRef<{ $implicit: FilaLote; index: number }>;

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
        next: (pagina) =>
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
              diasParaVencer:
                lote.estado === 'activo' && lote.fechaVencimiento
                  ? this.diasHasta(lote.fechaVencimiento)
                  : null,
            })),
          ),
        error: () => {
          this.lotes.set([]);
          this.errorLotes.set(true);
        },
      });
  }

  muestraAlertaVencimiento(dias: number | null): boolean {
    return dias !== null && dias >= 0 && dias <= DIAS_ALERTA_VENCIMIENTO;
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

  // GET /lotes-insumo?insumo_id=X ya devuelve los lotes ordenados por
  // fecha_vencimiento ascendente (nulls al final) — confirmado con el
  // backend. Por eso alcanza con tomar el primero que siga vigente: estado
  // "activo", no dado de baja (activo logico) y con fecha real (no null,
  // que es el caso de los insumos tipo empaque, que no vencen).
  proximoVencimiento = computed(() => {
    const primero = this.lotes().find(
      (lote) =>
        lote.estado === 'activo' && lote.activo && lote.fechaVencimientoMostrada !== SIN_DATO,
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
    this.tabActiva.set('informacion');
    this.lotes.set([]);
    this.errorLotes.set(false);
    this.closed.emit();
  }
}
