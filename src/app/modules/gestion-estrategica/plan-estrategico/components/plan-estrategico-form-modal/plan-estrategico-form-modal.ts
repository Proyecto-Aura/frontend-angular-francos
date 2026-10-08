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
import { LucideTriangleAlert } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { ApiErrorDto } from '../../interfaces/plan-estrategico-dto.interface';
import { PlanEstrategico, PlanEstrategicoForm } from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from '../../services/plan-estrategico.service';
import {
  PlanEstrategicoFormErrores,
  seSolapa,
  validarPlanForm,
} from './plan-estrategico-form.validaciones';

const ANIO_MIN = 2020;
const ANIO_MAX = 2060;

@Component({
  imports: [Button, Field, Icon, Input, Modal, Select, Textarea],
  selector: 'app-plan-estrategico-form-modal',
  templateUrl: './plan-estrategico-form-modal.html',
})
export class PlanEstrategicoFormModal {
  private planService = inject(PlanEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  plan = input<PlanEstrategico | null>(null);
  closed = output<void>();
  saved = output<PlanEstrategico>();

  readonly LucideTriangleAlert = LucideTriangleAlert;
  readonly opcionesAnioInicio: SelectOption[] = Array.from(
    { length: ANIO_MAX - ANIO_MIN },
    (_, index) => {
      const anio = String(ANIO_MIN + index);
      return { value: anio, label: anio };
    },
  );

  readonly opcionesAnioFin = computed<SelectOption[]>(() => {
    const anioInicio = this.anioInicio();
    const primerAnio = anioInicio ? Number(anioInicio) + 1 : ANIO_MIN + 1;

    return Array.from({ length: ANIO_MAX - primerAnio + 1 }, (_, index) => {
      const anio = String(primerAnio + index);
      return { value: anio, label: anio };
    });
  });

  nombre = signal('');
  descripcion = signal('');
  anioInicio = signal('');
  anioFin = signal('');
  errores = signal<PlanEstrategicoFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);
  private planesExistentes = signal<PlanEstrategico[]>([]);

  modoEdicion = computed(() => this.plan() !== null);
  titulo = computed(() =>
    this.modoEdicion() ? 'Editar plan estratégico' : 'Nuevo plan estratégico',
  );
  descripcionModal = computed(() =>
    this.modoEdicion()
      ? 'Solo puede editarse mientras el plan está en Borrador.'
      : 'El código se genera automáticamente y el estado inicial es Borrador.',
  );

  muestraSolapamiento = computed(() => {
    const anioInicio = this.anioInicio();
    const anioFin = this.anioFin();

    if (!anioInicio || !anioFin || Number(anioFin) <= Number(anioInicio)) {
      return false;
    }

    return seSolapa(Number(anioInicio), Number(anioFin), this.planesExistentes());
  });

  constructor() {
    effect(() => {
      const anioFin = this.anioFin();

      if (
        anioFin &&
        !this.opcionesAnioFin().some((opcion) => opcion.value === anioFin)
      ) {
        this.anioFin.set('');
      }
    });

    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarPlanForm(form);

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) {
      return;
    }

    this.guardando.set(true);
    const plan = this.plan();
    const request = plan
      ? this.planService.actualizar(plan.id, form)
      : this.planService.registrar(form);

    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (plan) => {
          this.saved.emit(plan);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  errorDe(campo: keyof PlanEstrategicoFormErrores): string | null {
    return this.errores()[campo] ?? null;
  }

  private inicializarFormulario(): void {
    const plan = this.plan();

    this.nombre.set(plan?.nombre ?? '');
    this.descripcion.set(plan?.descripcion ?? '');
    this.anioInicio.set(plan ? String(plan.anioInicio) : '');
    this.anioFin.set(plan ? String(plan.anioFin) : '');
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);
    this.planesExistentes.set([]);

    this.planService
      .listarTodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (planes) =>
          this.planesExistentes.set(
            plan ? planes.filter((planExistente) => planExistente.id !== plan.id) : planes,
          ),
        error: () => this.planesExistentes.set([]),
      });
  }

  private formActual(): PlanEstrategicoForm {
    return {
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      anioInicio: this.anioInicio(),
      anioFin: this.anioFin(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo guardar el plan. Intente nuevamente.');
      return;
    }

    const apiError = error.error as Partial<ApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');
    const mensajeNormalizado = mensaje.toLocaleLowerCase('es');

    if (error.status === 409 && mensajeNormalizado.includes('borrador')) {
      this.errorGeneral.set(mensaje);
      return;
    }

    if (error.status === 409 && mensajeNormalizado.includes('nombre')) {
      this.errores.update((actuales) => ({
        ...actuales,
        nombre: 'Ya existe un plan con este nombre.',
      }));
      return;
    }

    if (error.status === 409 && mensajeNormalizado.includes('año')) {
      this.errores.update((actuales) => ({
        ...actuales,
        anioFin: mensaje,
      }));
      return;
    }

    if (error.status === 400) {
      this.errorGeneral.set(mensaje || 'No se pudo guardar el plan. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para registrar planes estratégicos.');
      return;
    }

    this.errorGeneral.set('No se pudo guardar el plan. Intente nuevamente.');
  }
}
