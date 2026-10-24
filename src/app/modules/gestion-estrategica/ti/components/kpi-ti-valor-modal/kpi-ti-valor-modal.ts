import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { KpiApiErrorDto } from '../../../negocio/interfaces/kpi-dto.interface';
import { ColorSemaforo, Kpi, KpiValor, Periodo } from '../../../negocio/interfaces/kpi.interface';
import { CatalogoKpiService } from '../../../negocio/services/catalogo-kpi.service';
import { KpiTiService } from '../../services/kpi-ti.service';
import {
  OpcionPeriodoAnio,
  calcularCumplimiento,
  calcularSemaforo,
  formatearValor,
  opcionesPeriodoAnio,
} from '../../../negocio/components/kpi-form-modal/kpi.reglas';

@Component({
  imports: [Badge, Button, Field, Input, Modal, Select],
  selector: 'app-kpi-ti-valor-modal',
  templateUrl: './kpi-ti-valor-modal.html',
})
export class KpiTiValorModal {
  private catalogoService = inject(CatalogoKpiService);
  private kpiService = inject(KpiTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private solicitudActual = 0;

  open = input(false);
  kpi = input<Kpi | null>(null);
  plan = input.required<PlanEstrategico>();
  closed = output<void>();
  saved = output<void>();

  readonly periodos = signal<Periodo[]>([]);
  readonly historial = signal<KpiValor[]>([]);
  readonly periodoSeleccionado = signal('');
  readonly valor = signal('');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorCarga = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly errorValor = signal<string | null>(null);

  readonly opcionesPeriodo = computed<OpcionPeriodoAnio[]>(() =>
    opcionesPeriodoAnio(this.aniosDelPlan(), this.periodos()),
  );
  readonly opcionesSelect = computed<SelectOption[]>(() =>
    this.opcionesPeriodo().map((opcion) => ({
      value: this.clavePeriodo(opcion.anio, opcion.periodoId),
      label: opcion.etiqueta,
    })),
  );
  readonly opcionSeleccionada = computed(() => {
    const clave = this.periodoSeleccionado();
    return (
      this.opcionesPeriodo().find(
        (opcion) => this.clavePeriodo(opcion.anio, opcion.periodoId) === clave,
      ) ?? null
    );
  });
  readonly metaSeleccionada = computed(() => {
    const anio = this.opcionSeleccionada()?.anio;
    return this.kpi()?.metas.find((meta) => meta.anio === anio) ?? null;
  });
  readonly valorNumerico = computed(() => {
    if (!this.valor().trim()) return null;
    const numero = Number(this.valor());
    return Number.isFinite(numero) ? numero : null;
  });
  readonly colorPrevio = computed<ColorSemaforo | null>(() => {
    const valor = this.valorNumerico();
    const meta = this.metaSeleccionada();
    return valor !== null && meta ? calcularSemaforo(valor, meta) : null;
  });
  readonly cumplimientoPrevio = computed(() => {
    const valor = this.valorNumerico();
    const meta = this.metaSeleccionada();
    return valor !== null && meta ? calcularCumplimiento(valor, meta.meta) : null;
  });
  readonly valorExistente = computed(() => {
    const opcion = this.opcionSeleccionada();
    if (!opcion) return null;
    return (
      this.historial().find(
        (item) => item.anio === opcion.anio && item.periodoId === opcion.periodoId,
      ) ?? null
    );
  });
  readonly historialOrdenado = computed(() => {
    const numeroPeriodo = (periodoId: number) =>
      this.periodos().find((periodo) => periodo.id === periodoId)?.numero ?? 0;
    return [...this.historial()].sort(
      (a, b) => b.anio - a.anio || numeroPeriodo(b.periodoId) - numeroPeriodo(a.periodoId),
    );
  });

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.reiniciar();
        this.cargarDatos();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  reintentar(): void {
    this.cargarDatos();
  }

  registrar(): void {
    const kpi = this.kpi();
    const opcion = this.opcionSeleccionada();
    const valor = this.valorNumerico();
    this.errorValor.set(null);
    this.errorGeneral.set(null);

    if (!opcion) {
      this.errorGeneral.set('Seleccione un periodo.');
      return;
    }
    if (valor === null) {
      this.errorValor.set('Ingrese un valor numérico.');
      return;
    }
    if (!kpi || this.plan().estadoCodigo !== 'ACTIVO') {
      this.errorGeneral.set('Solo se pueden registrar valores de KPI cuando el plan está Activo.');
      return;
    }

    this.guardando.set(true);
    this.kpiService
      .registrarValor(kpi.id, opcion.anio, opcion.periodoId, valor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.saved.emit();
          this.closed.emit();
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.manejarError(error);
        },
      });
  }

  metaDeAnio(anio: number): number | null {
    return this.kpi()?.metas.find((meta) => meta.anio === anio)?.meta ?? null;
  }

  tonoColor(color: ColorSemaforo): BadgeTone {
    if (color === 'VERDE') return 'success';
    if (color === 'AMARILLO') return 'warning';
    return 'danger';
  }

  nombreColor(color: ColorSemaforo): string {
    if (color === 'VERDE') return 'Verde';
    if (color === 'AMARILLO') return 'Amarillo';
    return 'Rojo';
  }

  formatear(valor: number): string {
    return formatearValor(valor, this.kpi()?.unidadSimbolo ?? '');
  }

  formatearCumplimiento(valor: number | null): string {
    return valor === null
      ? 'No aplica'
      : `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(valor)} %`;
  }

  private cargarDatos(): void {
    const kpi = this.kpi();
    const solicitud = ++this.solicitudActual;
    if (!kpi) return;

    this.cargando.set(true);
    this.errorCarga.set(false);
    this.errorGeneral.set(null);
    forkJoin({
      periodos: this.catalogoService.listarPeriodos(kpi.frecuenciaId),
      historial: this.kpiService.listarValores(kpi.id),
    })
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ periodos, historial }) => {
          if (solicitud !== this.solicitudActual) return;
          this.periodos.set(periodos);
          this.historial.set(historial);
        },
        error: () => {
          if (solicitud !== this.solicitudActual) return;
          this.periodos.set([]);
          this.historial.set([]);
          this.errorCarga.set(true);
        },
      });
  }

  private reiniciar(): void {
    this.periodos.set([]);
    this.historial.set([]);
    this.periodoSeleccionado.set('');
    this.valor.set('');
    this.cargando.set(false);
    this.guardando.set(false);
    this.errorCarga.set(false);
    this.errorGeneral.set(null);
    this.errorValor.set(null);
  }

  private aniosDelPlan(): number[] {
    return Array.from(
      { length: this.plan().anioFin - this.plan().anioInicio + 1 },
      (_, indice) => this.plan().anioInicio + indice,
    );
  }

  private clavePeriodo(anio: number, periodoId: number): string {
    return `${anio}:${periodoId}`;
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo registrar el valor. Intente nuevamente.');
      return;
    }
    const apiError = error.error as Partial<KpiApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar KPIs.');
      return;
    }
    if (error.status === 404 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo registrar el valor. Intente nuevamente.');
      return;
    }
    this.errorGeneral.set('No se pudo registrar el valor. Intente nuevamente.');
  }
}
