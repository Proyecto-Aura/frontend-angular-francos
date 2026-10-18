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
  LucideBan,
  LucideCheck,
  LucideFlag,
  LucideLightbulb,
  LucideLock,
  LucidePencil,
  LucidePlay,
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
import { IniciativaCancelarModal } from '../../components/iniciativa-cancelar-modal/iniciativa-cancelar-modal';
import { IniciativaEliminarModal } from '../../components/iniciativa-eliminar-modal/iniciativa-eliminar-modal';
import { IniciativaEstadoModal } from '../../components/iniciativa-estado-modal/iniciativa-estado-modal';
import { IniciativaFormModal } from '../../components/iniciativa-form-modal/iniciativa-form-modal';
import {
  formatearFecha,
  formatearPresupuesto,
  puedeCancelar,
  siguienteEstado,
  tonoEstado,
} from '../../components/iniciativa-form-modal/iniciativa.reglas';
import {
  ESTADOS_INICIATIVA,
  EstadoIniciativaCodigo,
  Iniciativa,
} from '../../interfaces/iniciativa.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';

interface GrupoIniciativas {
  objetivo: ObjetivoEstrategico;
  total: number;
  iniciativas: Iniciativa[];
}

type ModalIniciativa = 'form' | 'estado' | 'cancelar' | 'eliminar' | null;

@Component({
  imports: [
    Badge,
    Button,
    Card,
    DataTable,
    Icon,
    IconButton,
    IniciativaCancelarModal,
    IniciativaEliminarModal,
    IniciativaEstadoModal,
    IniciativaFormModal,
    RouterLink,
  ],
  selector: 'app-gestionar-iniciativas-page',
  templateUrl: './gestionar-iniciativas-page.html',
})
export class GestionarIniciativasPage implements AfterViewInit {
  @ViewChild('iniciativaCell', { static: true })
  iniciativaCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  @ViewChild('responsableCell', { static: true })
  responsableCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  @ViewChild('inicioCell', { static: true })
  inicioCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  @ViewChild('finCell', { static: true })
  finCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  @ViewChild('presupuestoCell', { static: true })
  presupuestoCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: Iniciativa; index: number }>;

  private objetivoService = inject(ObjetivoEstrategicoService);
  private iniciativaService = inject(IniciativaService);
  private destroyRef = inject(DestroyRef);
  private solicitudActual = 0;

  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly LucideBan = LucideBan;
  readonly LucideCheck = LucideCheck;
  readonly LucideFlag = LucideFlag;
  readonly LucideLightbulb = LucideLightbulb;
  readonly LucideLock = LucideLock;
  readonly LucidePencil = LucidePencil;
  readonly LucidePlay = LucidePlay;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly estados = ESTADOS_INICIATIVA;
  readonly formatearFecha = formatearFecha;
  readonly formatearPresupuesto = formatearPresupuesto;
  readonly tonoEstado = tonoEstado;

  readonly columnas = signal<DsColumn[]>([
    { key: 'iniciativa', header: 'Iniciativa', width: '290px' },
    { key: 'responsable', header: 'Responsable', width: '170px' },
    { key: 'inicio', header: 'Inicio', width: '125px' },
    { key: 'fin', header: 'Fin', width: '125px' },
    { key: 'presupuesto', header: 'Presupuesto', align: 'right', width: '145px' },
    { key: 'estado', header: 'Estado', width: '130px' },
    { key: 'acciones', header: 'Acciones', align: 'right', width: '220px' },
  ]);
  readonly objetivos = signal<ObjetivoEstrategico[]>([]);
  readonly iniciativas = signal<Iniciativa[]>([]);
  readonly filtroEstado = signal<EstadoIniciativaCodigo | null>(null);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);
  readonly iniciativaSeleccionada = signal<Iniciativa | null>(null);
  readonly objetivoIdInicial = signal<number | null>(null);
  readonly modalActivo = signal<ModalIniciativa>(null);

  readonly grupos = computed<GrupoIniciativas[]>(() => {
    const filtro = this.filtroEstado();
    const iniciativas = this.iniciativas();
    return this.objetivos()
      .map((objetivo) => {
        const delObjetivo = iniciativas.filter(
          (iniciativa) => iniciativa.objetivoId === objetivo.id,
        );
        return {
          objetivo,
          total: delObjetivo.length,
          iniciativas: filtro
            ? delObjetivo.filter((iniciativa) => iniciativa.estadoCodigo === filtro)
            : delObjetivo,
        };
      })
      .filter((grupo) => filtro === null || grupo.iniciativas.length > 0);
  });
  readonly mensajeBanner = computed(() => {
    const estado = this.planSeleccionado.plan()?.estadoCodigo;
    if (estado === 'BORRADOR') {
      return 'Este plan está en Borrador. El estado de las iniciativas podrá actualizarse cuando el plan esté Activo.';
    }
    if (estado === 'ACTIVO') {
      return 'Este plan está Activo. Las iniciativas ya no pueden registrarse, editarse ni eliminarse; solo puede actualizarse su estado.';
    }
    return 'Este plan está Cerrado. Las iniciativas son de solo lectura.';
  });

  constructor() {
    effect(() => {
      const planId = this.planSeleccionado.planId();
      this.filtroEstado.set(null);
      this.objetivos.set([]);
      this.iniciativas.set([]);
      this.cerrarModal();
      this.cargarIniciativas(planId);
    });
  }

  ngAfterViewInit(): void {
    this.columnas.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'iniciativa') {
          return { ...columna, cellTemplate: this.iniciativaCellTpl };
        }
        if (columna.key === 'responsable') {
          return { ...columna, cellTemplate: this.responsableCellTpl };
        }
        if (columna.key === 'inicio') return { ...columna, cellTemplate: this.inicioCellTpl };
        if (columna.key === 'fin') return { ...columna, cellTemplate: this.finCellTpl };
        if (columna.key === 'presupuesto') {
          return { ...columna, cellTemplate: this.presupuestoCellTpl };
        }
        if (columna.key === 'estado') return { ...columna, cellTemplate: this.estadoCellTpl };
        if (columna.key === 'acciones') {
          return { ...columna, cellTemplate: this.accionesCellTpl };
        }
        return columna;
      }),
    );
  }

  cargarIniciativas(planId: number | null = this.planSeleccionado.planId()): void {
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
      iniciativas: this.iniciativaService.listarPorPlan(planId),
    })
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ objetivos, iniciativas }) => {
          if (solicitud !== this.solicitudActual) return;
          this.objetivos.set(objetivos);
          this.iniciativas.set(iniciativas);
        },
        error: () => {
          if (solicitud !== this.solicitudActual) return;
          this.objetivos.set([]);
          this.iniciativas.set([]);
          this.errorCarga.set(true);
        },
      });
  }

  seleccionarFiltro(estado: EstadoIniciativaCodigo | null): void {
    this.filtroEstado.set(estado);
  }

  conteoEstado(estado: EstadoIniciativaCodigo): number {
    return this.iniciativas().filter((iniciativa) => iniciativa.estadoCodigo === estado).length;
  }

  clasesFiltro(seleccionado: boolean): string {
    const base = 'h-8 rounded-full border px-3.5 text-ds-sm font-medium';
    const estado = seleccionado
      ? 'border-foreground bg-foreground text-primary-foreground'
      : 'border-border bg-card text-foreground hover:bg-muted';
    return `${base} ${estado}`;
  }

  abrirNuevo(objetivoId: number | null = null): void {
    this.iniciativaSeleccionada.set(null);
    this.objetivoIdInicial.set(objetivoId);
    this.modalActivo.set('form');
  }

  abrirEdicion(evento: MouseEvent, iniciativa: Iniciativa): void {
    evento.stopPropagation();
    if (!this.puedeEditar(iniciativa)) return;
    this.iniciativaSeleccionada.set(iniciativa);
    this.modalActivo.set('form');
  }

  abrirCambioEstado(evento: MouseEvent, iniciativa: Iniciativa): void {
    evento.stopPropagation();
    if (!this.puedeAvanzar(iniciativa)) return;
    this.iniciativaSeleccionada.set(iniciativa);
    this.modalActivo.set('estado');
  }

  abrirCancelacion(evento: MouseEvent, iniciativa: Iniciativa): void {
    evento.stopPropagation();
    if (!this.puedeCancelarIniciativa(iniciativa)) return;
    this.iniciativaSeleccionada.set(iniciativa);
    this.modalActivo.set('cancelar');
  }

  abrirEliminacion(evento: MouseEvent, iniciativa: Iniciativa): void {
    evento.stopPropagation();
    if (!this.puedeEliminar(iniciativa)) return;
    this.iniciativaSeleccionada.set(iniciativa);
    this.modalActivo.set('eliminar');
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
    this.iniciativaSeleccionada.set(null);
    this.objetivoIdInicial.set(null);
  }

  iniciativaActualizada(): void {
    this.cerrarModal();
    this.cargarIniciativas();
  }

  puedeAvanzar(iniciativa: Iniciativa): boolean {
    return (
      this.planSeleccionado.plan()?.estadoCodigo === 'ACTIVO' &&
      siguienteEstado(iniciativa.estadoCodigo) !== null
    );
  }

  puedeEditar(iniciativa: Iniciativa): boolean {
    return (
      this.planSeleccionado.plan()?.estadoCodigo === 'BORRADOR' &&
      iniciativa.estadoCodigo !== 'COMPLETADA' &&
      iniciativa.estadoCodigo !== 'CANCELADA'
    );
  }

  puedeCancelarIniciativa(iniciativa: Iniciativa): boolean {
    return (
      this.planSeleccionado.plan()?.estadoCodigo === 'ACTIVO' &&
      puedeCancelar(iniciativa.estadoCodigo)
    );
  }

  puedeEliminar(iniciativa: Iniciativa): boolean {
    return (
      this.planSeleccionado.plan()?.estadoCodigo === 'BORRADOR' &&
      iniciativa.estadoCodigo === 'PENDIENTE'
    );
  }

  siguienteNombre(iniciativa: Iniciativa): string {
    return siguienteEstado(iniciativa.estadoCodigo) === 'EN_PROCESO' ? 'En proceso' : 'Completada';
  }

  etiquetaAvanzar(iniciativa: Iniciativa): string {
    return this.puedeAvanzar(iniciativa)
      ? `Pasar a ${this.siguienteNombre(iniciativa)}`
      : 'El estado solo se actualiza con el plan Activo';
  }

  etiquetaEditar(iniciativa: Iniciativa): string {
    return this.puedeEditar(iniciativa) ? 'Editar' : 'Solo se edita con el plan en Borrador';
  }

  etiquetaCancelar(iniciativa: Iniciativa): string {
    return this.puedeCancelarIniciativa(iniciativa)
      ? 'Cancelar'
      : 'Solo se cancelan iniciativas pendientes o en proceso con el plan Activo';
  }

  etiquetaEliminar(iniciativa: Iniciativa): string {
    if (this.planSeleccionado.plan()?.estadoCodigo !== 'BORRADOR') {
      return 'Solo se elimina con el plan en Borrador';
    }
    return iniciativa.estadoCodigo === 'PENDIENTE'
      ? 'Eliminar'
      : 'Solo se eliminan iniciativas pendientes';
  }

  tonoPerspectiva(orden: number): BadgeTone {
    if (orden === 1) return 'success';
    if (orden === 2) return 'info';
    if (orden === 3) return 'warning';
    return 'neutral';
  }
}
