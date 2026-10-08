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
import { LucideCheck, LucidePlus } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Checkbox } from '../../../../../shared/ds/checkbox/checkbox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { ApiErrorDto } from '../../interfaces/objetivo-estrategico-dto.interface';
import {
  ObjetivoEstrategico,
  ObjetivoEstrategicoForm,
  PerspectivaBsc,
} from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';
import {
  ObjetivoEstrategicoFormErrores,
  validarObjetivoForm,
} from './objetivo-estrategico-form.validaciones';

@Component({
  imports: [Button, Checkbox, Field, Icon, Input, Modal, Textarea],
  selector: 'app-objetivo-estrategico-form-modal',
  templateUrl: './objetivo-estrategico-form-modal.html',
})
export class ObjetivoEstrategicoFormModal {
  private objetivoService = inject(ObjetivoEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  planId = input<number | null>(null);
  planNombre = input('');
  objetivo = input<ObjetivoEstrategico | null>(null);
  perspectivas = input<PerspectivaBsc[]>([]);
  objetivosDelPlan = input<ObjetivoEstrategico[]>([]);
  perspectivaInicialId = input<number | null>(null);
  closed = output<void>();
  saved = output<ObjetivoEstrategico>();

  readonly LucideCheck = LucideCheck;
  readonly LucidePlus = LucidePlus;

  readonly nombre = signal('');
  readonly descripcion = signal('');
  readonly responsable = signal('');
  readonly perspectivaId = signal<number | null>(null);
  readonly relacionesDestinoIds = signal<number[]>([]);
  readonly errores = signal<ObjetivoEstrategicoFormErrores>({});
  readonly errorRelaciones = signal<string | null>(null);
  readonly errorGeneral = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly modoEdicion = computed(() => this.objetivo() !== null);
  readonly titulo = computed(() =>
    this.modoEdicion() ? 'Editar objetivo estratégico' : 'Nuevo objetivo estratégico',
  );
  readonly perspectivasOrdenadas = computed(() =>
    [...this.perspectivas()].sort((a, b) => a.orden - b.orden),
  );
  readonly objetivosRelacionables = computed(() => {
    const objetivoId = this.objetivo()?.id;
    return this.objetivosDelPlan().filter((objetivo) => objetivo.id !== objetivoId);
  });

  constructor() {
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

  seleccionarPerspectiva(id: number): void {
    this.perspectivaId.set(id);
  }

  estaRelacionada(id: number): boolean {
    return this.relacionesDestinoIds().includes(id);
  }

  cambiarRelacion(id: number, seleccionada: boolean): void {
    this.relacionesDestinoIds.update((ids) =>
      seleccionada && !ids.includes(id)
        ? [...ids, id]
        : seleccionada
          ? ids
          : ids.filter((relacionId) => relacionId !== id),
    );
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarObjetivoForm(form);
    this.errores.set(errores);
    this.errorRelaciones.set(null);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) {
      return;
    }

    const objetivo = this.objetivo();
    const planId = this.planId();
    if (!objetivo && planId === null) {
      this.errorGeneral.set('No se pudo guardar el objetivo. Intente nuevamente.');
      return;
    }

    this.guardando.set(true);
    const request = objetivo
      ? this.objetivoService.actualizar(objetivo.id, form)
      : this.objetivoService.registrar(planId!, form);

    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (objetivoGuardado) => {
          this.saved.emit(objetivoGuardado);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  errorDe(campo: keyof ObjetivoEstrategicoFormErrores): string | null {
    return this.errores()[campo] ?? null;
  }

  clasesPerspectiva(perspectiva: PerspectivaBsc): string {
    const base =
      'flex min-h-10 items-center gap-2.5 rounded-(--radius-field) border px-3.5 py-2 text-left text-ds-base leading-tight';
    const seleccionada = this.perspectivaId() === perspectiva.id;
    const estado = seleccionada
      ? 'border-primary bg-accent font-medium text-accent-foreground'
      : 'border-border bg-card text-foreground hover:bg-muted';
    return `${base} ${estado}`;
  }

  clasePuntoPerspectiva(orden: number): string {
    const base = 'h-[7px] w-[7px] shrink-0 rounded-full';
    if (orden === 1) return `${base} bg-success`;
    if (orden === 2) return `${base} bg-info`;
    if (orden === 3) return `${base} bg-warning`;
    return `${base} bg-muted-foreground`;
  }

  private inicializarFormulario(): void {
    const objetivo = this.objetivo();
    this.nombre.set(objetivo?.nombre ?? '');
    this.descripcion.set(objetivo?.descripcion ?? '');
    this.responsable.set(objetivo?.responsable ?? '');
    this.perspectivaId.set(objetivo?.perspectivaId ?? this.perspectivaInicialId());
    this.relacionesDestinoIds.set([...(objetivo?.relacionesDestinoIds ?? [])]);
    this.errores.set({});
    this.errorRelaciones.set(null);
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private formActual(): ObjetivoEstrategicoForm {
    return {
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      responsable: this.responsable(),
      perspectivaId: this.perspectivaId(),
      relacionesDestinoIds: this.relacionesDestinoIds(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo guardar el objetivo. Intente nuevamente.');
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

    if (error.status === 409 && mensajeNormalizado.includes('nombre')) {
      this.errores.update((actuales) => ({
        ...actuales,
        nombre: 'Ya existe un objetivo con este nombre en el plan.',
      }));
      return;
    }

    const esErrorRelacion = [
      'relación',
      'relacion',
      'ciclo',
      'inversa',
      'consigo mismo',
      'destino',
    ].some((texto) => mensajeNormalizado.includes(texto));
    if ((error.status === 409 || error.status === 404) && esErrorRelacion) {
      this.errorRelaciones.set(mensaje);
      return;
    }

    if (error.status === 409 && mensajeNormalizado.includes('borrador')) {
      this.errorGeneral.set(mensaje);
      return;
    }

    if (error.status === 400) {
      this.errorGeneral.set(mensaje || 'No se pudo guardar el objetivo. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar objetivos estratégicos.');
      return;
    }

    this.errorGeneral.set('No se pudo guardar el objetivo. Intente nuevamente.');
  }
}
