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
import { LucidePencil, LucidePlus } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { Insumo, InsumoForm } from '../../interfaces/insumo.interface';
import { InsumoService } from '../../services/insumo.service';
import { InsumoFormErrores, validarInsumoForm } from './insumo-form.validaciones';

const FORM_VACIO: InsumoForm = {
  nombre: '',
  descripcion: '',
  tipo: '',
  unidadMedida: '',
  stockMinimo: '',
  stockMaximo: '',
};

@Component({
  imports: [Button, Field, Icon, Input, Modal, Select, Textarea],
  selector: 'app-insumo-form-modal',
  templateUrl: './insumo-form-modal.html',
})
export class InsumoFormModal {
  private insumoService = inject(InsumoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  /** null = modo crear. Con valor = modo editar (precarga y hace PATCH). */
  insumo = input<Insumo | null>(null);
  closed = output<void>();
  saved = output<Insumo>();

  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;

  readonly tipoOptions: SelectOption[] = [
    { value: 'materia_prima', label: 'Materia prima' },
    { value: 'empaque', label: 'Empaque' },
  ];

  readonly unidadOptions: SelectOption[] = [
    { value: 'kg', label: 'kg' },
    { value: 'litros', label: 'Litros' },
    { value: 'unidad', label: 'Unidad' },
  ];

  nombre = signal('');
  descripcion = signal('');
  tipo = signal('');
  unidadMedida = signal('');
  stockMinimo = signal('');
  stockMaximo = signal('');

  errores = signal<InsumoFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  modoEdicion = computed(() => this.insumo() !== null);
  titulo = computed(() => (this.modoEdicion() ? 'Editar insumo' : 'Registrar nuevo insumo'));
  tituloIcon = computed(() => (this.modoEdicion() ? LucidePencil : LucidePlus));
  skuMostrado = computed(() => this.insumo()?.sku ?? '');
  // Stock actual solo se ve (deshabilitado) en edicion — no hay modulo de
  // movimientos todavia, asi que este formulario nunca lo manda al backend.
  stockActualMostrado = computed(() => {
    const insumo = this.insumo();
    return insumo ? `${insumo.stockActual} ${insumo.unidadMedida}` : '';
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

  guardar(): void {
    const form = this.formActual();
    const errores = validarInsumoForm(form);

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) {
      return;
    }

    this.guardando.set(true);
    const insumo = this.insumo();
    const request = insumo
      ? this.insumoService.actualizar(insumo.id, form)
      : this.insumoService.registrar(form);

    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (insumoGuardado) => {
          this.saved.emit(insumoGuardado);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  errorDe(campo: keyof InsumoFormErrores): string | null {
    return this.errores()[campo] ?? null;
  }

  private inicializarFormulario(): void {
    const insumo = this.insumo();

    this.nombre.set(insumo?.nombre ?? FORM_VACIO.nombre);
    this.descripcion.set(insumo?.descripcion ?? FORM_VACIO.descripcion);
    this.tipo.set(insumo?.tipo ?? FORM_VACIO.tipo);
    this.unidadMedida.set(insumo?.unidadMedida ?? FORM_VACIO.unidadMedida);
    this.stockMinimo.set(insumo ? String(insumo.stockMinimo) : FORM_VACIO.stockMinimo);
    this.stockMaximo.set(insumo ? String(insumo.stockMaximo) : FORM_VACIO.stockMaximo);
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private formActual(): InsumoForm {
    return {
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      tipo: this.tipo() as InsumoForm['tipo'],
      unidadMedida: this.unidadMedida() as InsumoForm['unidadMedida'],
      stockMinimo: this.stockMinimo(),
      stockMaximo: this.stockMaximo(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo guardar el insumo. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para registrar insumos.');
      return;
    }

    const apiError = error.error as { message?: string | string[] } | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');

    // El backend responde 409 (no 400) cuando stock_maximo < stock_minimo.
    if (error.status === 409 && mensaje.toLocaleLowerCase('es').includes('stock')) {
      this.errores.update((actuales) => ({ ...actuales, stockMaximo: mensaje }));
      return;
    }

    if (error.status === 400 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo guardar el insumo. Intente nuevamente.');
      return;
    }

    this.errorGeneral.set('No se pudo guardar el insumo. Intente nuevamente.');
  }
}
