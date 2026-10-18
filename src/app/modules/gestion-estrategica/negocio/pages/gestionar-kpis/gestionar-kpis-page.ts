import { RouterLink } from '@angular/router';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideChartLine,
  LucideEye,
  LucideLock,
  LucidePencil,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { KpiEliminarModal } from '../../components/kpi-eliminar-modal/kpi-eliminar-modal';
import { KpiFormModal } from '../../components/kpi-form-modal/kpi-form-modal';
import { formatearValor } from '../../components/kpi-form-modal/kpi.reglas';
import { KpiValorModal } from '../../components/kpi-valor-modal/kpi-valor-modal';
import { Kpi } from '../../interfaces/kpi.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { KpiService } from '../../services/kpi.service';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';

@Component({
  imports: [
    Badge,
    Button,
    Card,
    DataTable,
    Icon,
    IconButton,
    KpiEliminarModal,
    KpiFormModal,
    KpiValorModal,
    RouterLink,
  ],
  selector: 'app-gestionar-kpis-page',
  templateUrl: './gestionar-kpis-page.html',
})
export class GestionarKpisPage implements AfterViewInit {
  @ViewChild('kpiCell', { static: true })
  kpiCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  @ViewChild('objetivoCell', { static: true })
  objetivoCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  @ViewChild('frecuenciaCell', { static: true })
  frecuenciaCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  @ViewChild('metaCell', { static: true })
  metaCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  @ViewChild('ultimoValorCell', { static: true })
  ultimoValorCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  @ViewChild('semaforoCell', { static: true })
  semaforoCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: Kpi; index: number }>;

  private objetivoService = inject(ObjetivoEstrategicoService);
  private kpiService = inject(KpiService);
  private destroyRef = inject(DestroyRef);
  private solicitudActual = 0;

  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly LucideChartLine = LucideChartLine;
  readonly LucideEye = LucideEye;
  readonly LucideLock = LucideLock;
  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;

  readonly columnas = signal<DsColumn[]>([
    { key: 'kpi', header: 'KPI', width: '420px' },
    { key: 'objetivo', header: 'Objetivo', width: '280px' },
    { key: 'frecuencia', header: 'Frecuencia', width: '140px' },
    { key: 'meta', header: 'Meta final', align: 'right', width: '140px' },
    { key: 'ultimoValor', header: 'Último valor', align: 'right', width: '180px' },
    { key: 'semaforo', header: 'Semáforo', width: '130px' },
    { key: 'acciones', header: 'Acciones', align: 'right', width: '170px' },
  ]);
  readonly objetivos = signal<ObjetivoEstrategico[]>([]);
  readonly kpis = signal<Kpi[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);
  readonly kpiSeleccionado = signal<Kpi | null>(null);
  readonly modalActivo = signal<'form' | 'valor' | 'eliminar' | null>(null);

  readonly mensajeSoloLectura = computed(() =>
    this.planSeleccionado.plan()?.estadoCodigo === 'ACTIVO'
      ? 'Este plan está Activo. Los KPIs ya no pueden editarse; solo puede registrarse su valor por periodo.'
      : 'Este plan está Cerrado. Los KPIs son de solo lectura.',
  );
  readonly mensajeVacio = computed(() =>
    this.planSeleccionado.plan()?.estadoCodigo === 'BORRADOR'
      ? 'Crea el primero con "Nuevo KPI".'
      : 'Este plan no registra KPIs.',
  );

  constructor() {
    effect(() => {
      const planId = this.planSeleccionado.planId();
      this.objetivos.set([]);
      this.kpis.set([]);
      this.cargarKpis(planId);
    });
  }

  ngAfterViewInit(): void {
    this.columnas.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'kpi') return { ...columna, cellTemplate: this.kpiCellTpl };
        if (columna.key === 'objetivo') {
          return { ...columna, cellTemplate: this.objetivoCellTpl };
        }
        if (columna.key === 'frecuencia') {
          return { ...columna, cellTemplate: this.frecuenciaCellTpl };
        }
        if (columna.key === 'meta') return { ...columna, cellTemplate: this.metaCellTpl };
        if (columna.key === 'ultimoValor') {
          return { ...columna, cellTemplate: this.ultimoValorCellTpl };
        }
        if (columna.key === 'semaforo') {
          return { ...columna, cellTemplate: this.semaforoCellTpl };
        }
        if (columna.key === 'acciones') {
          return { ...columna, cellTemplate: this.accionesCellTpl };
        }
        return columna;
      }),
    );
  }

  cargarKpis(planId: number | null = this.planSeleccionado.planId()): void {
    const solicitud = ++this.solicitudActual;
    if (planId === null) {
      this.cargando.set(false);
      this.errorCarga.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set(false);
    forkJoin({
      objetivos: this.objetivoService.listarPorPlan(planId),
      kpis: this.kpiService.listarPorPlan(planId),
    })
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ objetivos, kpis }) => {
          if (solicitud !== this.solicitudActual) return;
          this.objetivos.set(objetivos);
          this.kpis.set(kpis);
        },
        error: () => {
          if (solicitud !== this.solicitudActual) return;
          this.objetivos.set([]);
          this.kpis.set([]);
          this.errorCarga.set(true);
        },
      });
  }

  abrirNuevo(): void {
    this.kpiSeleccionado.set(null);
    this.modalActivo.set('form');
  }

  abrirVer(kpi: Kpi): void {
    this.kpiSeleccionado.set(kpi);
    this.modalActivo.set('form');
  }

  abrirFormularioDesdeFila(evento: { row: unknown }): void {
    this.kpiSeleccionado.set(evento.row as Kpi);
    this.modalActivo.set('form');
  }

  abrirRegistro(evento: MouseEvent, kpi: Kpi): void {
    evento.stopPropagation();
    if (this.planSeleccionado.plan()?.estadoCodigo !== 'ACTIVO') return;
    this.kpiSeleccionado.set(kpi);
    this.modalActivo.set('valor');
  }

  abrirVerDesdeAccion(evento: MouseEvent, kpi: Kpi): void {
    evento.stopPropagation();
    this.abrirVer(kpi);
  }

  abrirEdicion(evento: MouseEvent, kpi: Kpi): void {
    evento.stopPropagation();
    this.kpiSeleccionado.set(kpi);
    this.modalActivo.set('form');
  }

  abrirEliminacion(evento: MouseEvent, kpi: Kpi): void {
    evento.stopPropagation();
    this.kpiSeleccionado.set(kpi);
    this.modalActivo.set('eliminar');
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
    this.kpiSeleccionado.set(null);
  }

  kpiGuardado(): void {
    this.cerrarModal();
    this.cargarKpis();
  }

  kpiEliminado(): void {
    this.cerrarModal();
    this.cargarKpis();
  }

  valorGuardado(): void {
    this.cerrarModal();
    this.cargarKpis();
  }

  formatearMeta(kpi: Kpi): string {
    return kpi.metaFinal === null
      ? 'Sin definir'
      : formatearValor(kpi.metaFinal, kpi.unidadSimbolo);
  }

  formatearUltimoValor(kpi: Kpi): string {
    return kpi.ultimoValor
      ? formatearValor(kpi.ultimoValor.valor, kpi.unidadSimbolo)
      : 'Sin registros';
  }

  tonoSemaforo(kpi: Kpi): BadgeTone {
    if (kpi.ultimoValor?.color === 'VERDE') return 'success';
    if (kpi.ultimoValor?.color === 'AMARILLO') return 'warning';
    return 'danger';
  }

  textoSemaforo(kpi: Kpi): string {
    if (kpi.ultimoValor?.color === 'VERDE') return 'Verde';
    if (kpi.ultimoValor?.color === 'AMARILLO') return 'Amarillo';
    return 'Rojo';
  }
}
