import { RouterLink } from '@angular/router';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideFlag,
  LucideLock,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideTrash2,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { ObjetivoEstrategicoEliminarModal } from '../../components/objetivo-estrategico-eliminar-modal/objetivo-estrategico-eliminar-modal';
import { ObjetivoEstrategicoEstadoModal } from '../../components/objetivo-estrategico-estado-modal/objetivo-estrategico-estado-modal';
import { ObjetivoEstrategicoFormModal } from '../../components/objetivo-estrategico-form-modal/objetivo-estrategico-form-modal';
import {
  EstadoObjetivoCodigo,
  ObjetivoEstrategico,
  PerspectivaBsc,
  TRANSICIONES_OBJETIVO,
} from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';

@Component({
  imports: [
    Badge,
    Button,
    Card,
    DataTable,
    Icon,
    IconButton,
    ObjetivoEstrategicoEliminarModal,
    ObjetivoEstrategicoEstadoModal,
    ObjetivoEstrategicoFormModal,
    RouterLink,
  ],
  selector: 'app-objetivos-estrategicos',
  templateUrl: './objetivos-estrategicos.html',
})
export class ObjetivosEstrategicosPage implements AfterViewInit, OnInit {
  @ViewChild('objetivoCell', { static: true })
  objetivoCellTpl!: TemplateRef<{ $implicit: ObjetivoEstrategico; index: number }>;

  @ViewChild('perspectivaCell', { static: true })
  perspectivaCellTpl!: TemplateRef<{ $implicit: ObjetivoEstrategico; index: number }>;

  @ViewChild('responsableCell', { static: true })
  responsableCellTpl!: TemplateRef<{ $implicit: ObjetivoEstrategico; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: ObjetivoEstrategico; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: ObjetivoEstrategico; index: number }>;

  private objetivoService = inject(ObjetivoEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private solicitudActual = 0;

  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly LucideFlag = LucideFlag;
  readonly LucideLock = LucideLock;
  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;
  readonly LucideRefreshCw = LucideRefreshCw;
  readonly LucideTrash2 = LucideTrash2;

  readonly columnas = signal<DsColumn[]>([
    { key: 'objetivo', header: 'Objetivo' },
    { key: 'perspectiva', header: 'Perspectiva' },
    { key: 'responsable', header: 'Responsable' },
    { key: 'estado', header: 'Estado' },
    { key: 'acciones', header: 'Acciones', align: 'right' },
  ]);
  readonly perspectivas = signal<PerspectivaBsc[]>([]);
  readonly objetivos = signal<ObjetivoEstrategico[]>([]);
  readonly perspectivaSeleccionadaId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);
  readonly objetivoSeleccionado = signal<ObjetivoEstrategico | null>(null);
  readonly modalActivo = signal<'form' | 'estado' | 'eliminar' | null>(null);

  readonly objetivosFiltrados = computed(() => {
    const perspectivaId = this.perspectivaSeleccionadaId();
    return perspectivaId === null
      ? this.objetivos()
      : this.objetivos().filter((objetivo) => objetivo.perspectivaId === perspectivaId);
  });
  readonly perspectivaSeleccionada = computed(
    () =>
      this.perspectivas().find(
        (perspectiva) => perspectiva.id === this.perspectivaSeleccionadaId(),
      ) ?? null,
  );
  readonly mensajeSoloLectura = computed(() =>
    this.planSeleccionado.plan()?.estadoCodigo === 'ACTIVO'
      ? 'Este plan está activo. Solo puede actualizarse el estado de los objetivos.'
      : 'Este plan está cerrado. Los objetivos son de solo lectura.',
  );
  readonly mensajeVacio = computed(() => {
    const plan = this.planSeleccionado.plan();
    if (plan?.estadoCodigo !== 'BORRADOR') {
      return 'Este plan no registra objetivos.';
    }

    const perspectiva = this.perspectivaSeleccionada();
    if (perspectiva && this.objetivos().length > 0) {
      return `Sin objetivos en la perspectiva ${perspectiva.nombre}.`;
    }

    return 'Crea el primero con "Nuevo objetivo".';
  });

  constructor() {
    effect(() => {
      const planId = this.planSeleccionado.planId();
      this.perspectivaSeleccionadaId.set(null);
      this.objetivos.set([]);
      this.cargarObjetivos(planId);
    });
  }

  ngOnInit(): void {
    this.objetivoService
      .listarPerspectivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perspectivas) =>
          this.perspectivas.set([...perspectivas].sort((a, b) => a.orden - b.orden)),
        error: () => this.perspectivas.set([]),
      });
  }

  ngAfterViewInit(): void {
    this.columnas.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'objetivo') {
          return { ...columna, cellTemplate: this.objetivoCellTpl };
        }
        if (columna.key === 'perspectiva') {
          return { ...columna, cellTemplate: this.perspectivaCellTpl };
        }
        if (columna.key === 'responsable') {
          return { ...columna, cellTemplate: this.responsableCellTpl };
        }
        if (columna.key === 'estado') {
          return { ...columna, cellTemplate: this.estadoCellTpl };
        }
        if (columna.key === 'acciones') {
          return { ...columna, cellTemplate: this.accionesCellTpl };
        }
        return columna;
      }),
    );
  }

  cargarObjetivos(planId: number | null = this.planSeleccionado.planId()): void {
    const solicitud = ++this.solicitudActual;
    if (planId === null) {
      this.cargando.set(false);
      this.errorCarga.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set(false);
    this.objetivoService
      .listarPorPlan(planId)
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) {
            this.cargando.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (objetivos) => {
          if (solicitud === this.solicitudActual) {
            this.objetivos.set(objetivos);
          }
        },
        error: () => {
          if (solicitud === this.solicitudActual) {
            this.objetivos.set([]);
            this.errorCarga.set(true);
          }
        },
      });
  }

  seleccionarPerspectiva(id: number | null): void {
    this.perspectivaSeleccionadaId.set(id);
  }

  abrirNuevoObjetivo(): void {
    this.objetivoSeleccionado.set(null);
    this.modalActivo.set('form');
  }

  abrirEdicion(event: MouseEvent, objetivo: ObjetivoEstrategico): void {
    event.stopPropagation();
    this.objetivoSeleccionado.set(objetivo);
    this.modalActivo.set('form');
  }

  abrirCambioEstado(event: MouseEvent, objetivo: ObjetivoEstrategico): void {
    event.stopPropagation();
    this.objetivoSeleccionado.set(objetivo);
    this.modalActivo.set('estado');
  }

  abrirEliminacion(event: MouseEvent, objetivo: ObjetivoEstrategico): void {
    event.stopPropagation();
    this.objetivoSeleccionado.set(objetivo);
    this.modalActivo.set('eliminar');
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
    this.objetivoSeleccionado.set(null);
  }

  objetivoGuardado(): void {
    this.cerrarModal();
    this.cargarObjetivos();
  }

  objetivoEliminado(): void {
    this.cerrarModal();
    this.cargarObjetivos();
  }

  puedeCambiarEstado(objetivo: ObjetivoEstrategico): boolean {
    return (
      this.planSeleccionado.plan()?.estadoCodigo === 'ACTIVO' &&
      TRANSICIONES_OBJETIVO[objetivo.estadoCodigo].length > 0
    );
  }

  conteoPerspectiva(id: number): number {
    return this.objetivos().filter((objetivo) => objetivo.perspectivaId === id).length;
  }

  clasesFiltro(seleccionado: boolean): string {
    const base = 'h-8 rounded-full border px-3.5 text-ds-sm font-medium';
    const estado = seleccionado
      ? 'border-foreground bg-foreground text-primary-foreground'
      : 'border-border bg-card text-foreground hover:bg-muted';
    return `${base} ${estado}`;
  }

  tonoPerspectiva(orden: number): BadgeTone {
    if (orden === 1) return 'success';
    if (orden === 2) return 'info';
    if (orden === 3) return 'warning';
    return 'neutral';
  }

  tonoEstado(estado: EstadoObjetivoCodigo): BadgeTone {
    if (estado === 'EN_PROCESO') return 'warning';
    if (estado === 'CUMPLIDO') return 'success';
    if (estado === 'CANCELADO') return 'danger';
    return 'neutral';
  }
}
