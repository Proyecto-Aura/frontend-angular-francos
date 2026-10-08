import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideCircleDot,
  LucideLock,
  LucidePencil,
  LucidePencilLine,
  LucidePlus,
  LucideRefreshCw,
  LucideTarget,
  LucideTrash2,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { PlanEstrategicoEliminarModal } from '../../components/plan-estrategico-eliminar-modal/plan-estrategico-eliminar-modal';
import { PlanEstrategicoEstadoModal } from '../../components/plan-estrategico-estado-modal/plan-estrategico-estado-modal';
import { PlanEstrategicoFormModal } from '../../components/plan-estrategico-form-modal/plan-estrategico-form-modal';
import { EstadoPlanCodigo, PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from '../../services/plan-estrategico.service';

@Component({
  imports: [
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    Icon,
    IconButton,
    KpiCard,
    Pagination,
    PlanEstrategicoEliminarModal,
    PlanEstrategicoEstadoModal,
    PlanEstrategicoFormModal,
  ],
  selector: 'app-plan-estrategico-home',
  templateUrl: './plan-estrategico-home.html',
})
export class PlanEstrategicoHome implements AfterViewInit, OnInit {
  @ViewChild('planCell', { static: true })
  planCellTpl!: TemplateRef<{ $implicit: PlanEstrategico; index: number }>;

  @ViewChild('aniosCell', { static: true })
  aniosCellTpl!: TemplateRef<{ $implicit: PlanEstrategico; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: PlanEstrategico; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: PlanEstrategico; index: number }>;

  private planService = inject(PlanEstrategicoService);
  private destroyRef = inject(DestroyRef);

  readonly LucidePlus = LucidePlus;
  readonly LucideTarget = LucideTarget;
  readonly LucideCircleDot = LucideCircleDot;
  readonly LucidePencilLine = LucidePencilLine;
  readonly LucideLock = LucideLock;
  readonly LucidePencil = LucidePencil;
  readonly LucideRefreshCw = LucideRefreshCw;
  readonly LucideTrash2 = LucideTrash2;
  readonly tamanioPagina = 10;

  columnas = signal<DsColumn[]>([
    { key: 'plan', header: 'Plan' },
    { key: 'anios', header: 'Años', numeric: true },
    { key: 'estado', header: 'Estado' },
    { key: 'acciones', header: 'Acciones', align: 'right' },
  ]);
  planes = signal<PlanEstrategico[]>([]);
  pagina = signal(1);
  total = signal(0);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);
  resumen = signal<{
    total: number;
    activos: number;
    borradores: number;
    cerrados: number;
  } | null>(null);
  planSeleccionado = signal<PlanEstrategico | null>(null);
  planActivo = signal<PlanEstrategico | null>(null);
  modalActivo = signal<'form' | 'estado' | 'eliminar' | null>(null);

  ngOnInit(): void {
    this.cargarPlanes();
    this.cargarResumen();
  }

  ngAfterViewInit(): void {
    this.columnas.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'plan') return { ...columna, cellTemplate: this.planCellTpl };
        if (columna.key === 'anios') return { ...columna, cellTemplate: this.aniosCellTpl };
        if (columna.key === 'estado') return { ...columna, cellTemplate: this.estadoCellTpl };
        if (columna.key === 'acciones') return { ...columna, cellTemplate: this.accionesCellTpl };
        return columna;
      }),
    );
  }

  cargarPlanes(pagina = this.pagina()): void {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.planService
      .listar(pagina, this.tamanioPagina)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.planes.set(resultado.planes);
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.planes.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  cargarResumen(): void {
    this.resumen.set(null);

    this.planService
      .listarTodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (planes) => {
          this.resumen.set({
            total: planes.length,
            activos: planes.filter((plan) => plan.estadoCodigo === 'ACTIVO').length,
            borradores: planes.filter((plan) => plan.estadoCodigo === 'BORRADOR').length,
            cerrados: planes.filter((plan) => plan.estadoCodigo === 'CERRADO').length,
          });
        },
        error: () => this.resumen.set(null),
      });
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarPlanes(pagina);
    }
  }

  abrirNuevoPlan(): void {
    this.planSeleccionado.set(null);
    this.modalActivo.set('form');
  }

  abrirEdicion(event: MouseEvent, plan: PlanEstrategico): void {
    event.stopPropagation();
    this.planSeleccionado.set(plan);
    this.modalActivo.set('form');
  }

  abrirCambioEstado(event: MouseEvent, plan: PlanEstrategico): void {
    event.stopPropagation();
    this.planSeleccionado.set(plan);
    this.planActivo.set(null);

    this.planService
      .listarTodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (planes) => {
          this.planActivo.set(
            planes.find(
              (planExistente) =>
                planExistente.estadoCodigo === 'ACTIVO' && planExistente.id !== plan.id,
            ) ?? null,
          );
          this.modalActivo.set('estado');
        },
        error: () => {
          this.planActivo.set(null);
          this.modalActivo.set('estado');
        },
      });
  }

  abrirEliminacion(event: MouseEvent, plan: PlanEstrategico): void {
    event.stopPropagation();
    this.planSeleccionado.set(plan);
    this.modalActivo.set('eliminar');
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
    this.planSeleccionado.set(null);
    this.planActivo.set(null);
  }

  planGuardado(): void {
    this.cerrarModal();
    this.cargarPlanes(this.pagina());
    this.cargarResumen();
  }

  planEliminado(): void {
    const paginaDestino =
      this.planes().length <= 1 && this.pagina() > 1 ? this.pagina() - 1 : this.pagina();
    this.cerrarModal();
    this.cargarPlanes(paginaDestino);
    this.cargarResumen();
  }

  tonoEstado(estado: EstadoPlanCodigo): BadgeTone {
    if (estado === 'ACTIVO') return 'success';
    if (estado === 'CERRADO') return 'info';
    return 'neutral';
  }
}
