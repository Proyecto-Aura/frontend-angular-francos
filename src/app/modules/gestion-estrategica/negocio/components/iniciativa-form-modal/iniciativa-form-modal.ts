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
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { IniciativaApiErrorDto } from '../../interfaces/iniciativa-dto.interface';
import { Iniciativa, IniciativaForm } from '../../interfaces/iniciativa.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { ErroresIniciativaForm, validarFormularioIniciativa } from './iniciativa.reglas';

@Component({
  imports: [Badge, Button, Field, Input, Modal, Select, Textarea],
  selector: 'app-iniciativa-form-modal',
  templateUrl: './iniciativa-form-modal.html',
})
export class IniciativaFormModal {
  private iniciativaService = inject(IniciativaService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  plan = input.required<PlanEstrategico>();
  objetivos = input<ObjetivoEstrategico[]>([]);
  iniciativa = input<Iniciativa | null>(null);
  objetivoIdInicial = input<number | null>(null);
  closed = output<void>();
  saved = output<Iniciativa>();

  readonly nombre = signal('');
  readonly descripcion = signal('');
  readonly objetivoId = signal('');
  readonly responsable = signal('');
  readonly fechaInicio = signal('');
  readonly fechaFin = signal('');
  readonly guardando = signal(false);
  readonly errores = signal<ErroresIniciativaForm>({});
  readonly errorGeneral = signal<string | null>(null);

  readonly modoEdicion = computed(() => this.iniciativa() !== null);
  readonly titulo = computed(() => (this.modoEdicion() ? 'Editar iniciativa' : 'Nueva iniciativa'));
  readonly opcionesObjetivo = computed<SelectOption[]>(() =>
    this.objetivos()
      .filter((objetivo) => objetivo.estadoCodigo !== 'CANCELADO')
      .map((objetivo) => ({
        value: String(objetivo.id),
        label: `${objetivo.codigo} · ${objetivo.nombre}`,
      })),
  );
  readonly fechaMinima = computed(() => `${this.plan().anioInicio}-01-01`);
  readonly fechaMaxima = computed(() => `${this.plan().anioFin}-12-31`);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) this.inicializarFormulario();
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  guardar(): void {
    if (this.guardando()) return;

    const form = this.formActual();
    const errores = validarFormularioIniciativa(form, this.plan());
    this.errores.set(errores);
    this.errorGeneral.set(null);
    if (Object.keys(errores).length > 0) return;

    this.guardando.set(true);
    const iniciativa = this.iniciativa();
    const request = iniciativa
      ? this.iniciativaService.actualizar(iniciativa.id, form)
      : this.iniciativaService.crear(form);

    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (guardada) => {
          this.saved.emit(guardada);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private inicializarFormulario(): void {
    const iniciativa = this.iniciativa();
    this.nombre.set(iniciativa?.nombre ?? '');
    this.descripcion.set(iniciativa?.descripcion ?? '');
    this.objetivoId.set(
      iniciativa
        ? String(iniciativa.objetivoId)
        : this.objetivoIdInicial() === null
          ? ''
          : String(this.objetivoIdInicial()),
    );
    this.responsable.set(iniciativa?.responsable ?? '');
    this.fechaInicio.set(iniciativa?.fechaInicio ?? '');
    this.fechaFin.set(iniciativa?.fechaFin ?? '');
    this.guardando.set(false);
    this.errores.set({});
    this.errorGeneral.set(null);
  }

  private formActual(): IniciativaForm {
    return {
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      objetivoId: this.objetivoId() ? Number(this.objetivoId()) : null,
      responsable: this.responsable(),
      fechaInicio: this.fechaInicio(),
      fechaFin: this.fechaFin(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo guardar la iniciativa. Intente nuevamente.');
      return;
    }

    const apiError = error.error as Partial<IniciativaApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');
    const normalizado = mensaje.toLocaleLowerCase('es');

    if (error.status === 409 && normalizado.includes('nombre')) {
      this.errores.update((actuales) => ({
        ...actuales,
        nombre: 'Ya existe una iniciativa con este nombre en el objetivo.',
      }));
      return;
    }
    if (error.status === 409 || error.status === 400) {
      this.errorGeneral.set(mensaje || 'No se pudo guardar la iniciativa. Intente nuevamente.');
      return;
    }
    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar iniciativas.');
      return;
    }
    this.errorGeneral.set('No se pudo guardar la iniciativa. Intente nuevamente.');
  }
}
