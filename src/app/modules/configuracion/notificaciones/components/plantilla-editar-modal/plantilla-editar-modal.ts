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

import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import {
  PlantillaCorreo,
  PlantillaErrores,
  PlantillaForm,
  plantillaFormDe,
  validarPlantilla,
} from '../../interfaces/notificacion.interface';
import { NotificacionesService } from '../../services/notificaciones.service';

const FORM_VACIO: PlantillaForm = { asunto: '', cuerpo: '' };

/** RF-A187: editar asunto y cuerpo de una plantilla de correo. */
@Component({
  imports: [Alert, Button, Field, Input, Modal, Textarea],
  selector: 'app-plantilla-editar-modal',
  templateUrl: './plantilla-editar-modal.html',
})
export class PlantillaEditarModal {
  private service = inject(NotificacionesService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  plantilla = input<PlantillaCorreo | null>(null);
  closed = output<void>();
  saved = output<PlantillaCorreo>();

  readonly form = signal<PlantillaForm>({ ...FORM_VACIO });
  readonly intentoGuardar = signal(false);
  readonly guardando = signal(false);

  protected readonly errores = computed<PlantillaErrores>(() =>
    this.intentoGuardar() ? validarPlantilla(this.form()) : {},
  );

  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  private alertaTimer: ReturnType<typeof setTimeout> | null = null;
  private limpiarAlerta(): void {
    if (this.alertaTimer) clearTimeout(this.alertaTimer);
    this.alertaTimer = null;
    this.toast.set(null);
  }
  private mostrarAlerta(tone: AlertTone, title: string, description?: string): void {
    this.limpiarAlerta();
    this.toast.set({ tone, title, description });
    this.alertaTimer = setTimeout(() => this.limpiarAlerta(), 4500);
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.limpiarAlerta());
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) this.prepararFormulario();
      this.estabaAbierto = estaAbierto;
    });
  }

  private prepararFormulario(): void {
    const plantilla = this.plantilla();
    this.form.set(plantilla ? plantillaFormDe(plantilla) : { ...FORM_VACIO });
    this.intentoGuardar.set(false);
    this.guardando.set(false);
    this.limpiarAlerta();
  }

  protected cambiar<K extends keyof PlantillaForm>(campo: K, valor: PlantillaForm[K]): void {
    this.form.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected guardar(): void {
    this.intentoGuardar.set(true);
    const plantilla = this.plantilla();
    if (!plantilla) return;

    if (Object.keys(validarPlantilla(this.form())).length > 0) {
      this.mostrarAlerta(
        'warning',
        'Faltan campos por completar',
        'Revisa los campos marcados antes de guardar.',
      );
      return;
    }

    const { asunto, cuerpo } = this.form();
    this.guardando.set(true);
    this.service
      .actualizarPlantilla(plantilla.clave, asunto.trim(), cuerpo.trim())
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizada) => {
          this.saved.emit(actualizada);
          this.closed.emit();
        },
        error: (error: unknown) => {
          const mensaje = apiErrorMessage(
            error,
            'No se pudo guardar la plantilla. Intente nuevamente.',
          );
          this.mostrarAlerta('error', mensaje);
        },
      });
  }
}
