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

import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Switch } from '../../../../../shared/ds/switch/switch';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { TipoDocumentoDto } from '../../interfaces/usuario-dto.interface';
import {
  Rol,
  TIPOS_DOCUMENTO,
  USUARIO_FORM_VACIO,
  Usuario,
  UsuarioErrores,
  UsuarioForm,
  conflictoDeCampo,
  usuarioFormDe,
  validarUsuario,
} from '../../interfaces/usuario.interface';
import { UsuariosService } from '../../services/usuarios.service';

export interface UsuarioGuardado {
  usuario: Usuario;
  modo: 'nuevo' | 'editar';
}

@Component({
  imports: [Button, Field, Input, Modal, Select, Switch],
  selector: 'app-usuario-form-modal',
  templateUrl: './usuario-form-modal.html',
})
export class UsuarioFormModal {
  private usuariosService = inject(UsuariosService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  /** null = crear un usuario nuevo. */
  usuario = input<Usuario | null>(null);
  roles = input<Rol[]>([]);
  closed = output<void>();
  saved = output<UsuarioGuardado>();

  protected readonly tiposDocumento: SelectOption[] = TIPOS_DOCUMENTO;

  readonly form = signal<UsuarioForm>({ ...USUARIO_FORM_VACIO });
  readonly intentoGuardar = signal(false);
  readonly guardando = signal(false);
  readonly errorGeneral = signal('');
  private readonly erroresServidor = signal<UsuarioErrores>({});

  protected readonly modo = computed<'nuevo' | 'editar'>(() =>
    this.usuario() ? 'editar' : 'nuevo',
  );
  protected readonly opcionesRol = computed<SelectOption[]>(() =>
    this.roles().map((rol) => ({ value: String(rol.id), label: rol.etiqueta })),
  );

  protected readonly errores = computed<UsuarioErrores>(() => ({
    ...(this.intentoGuardar() ? validarUsuario(this.form(), this.modo()) : {}),
    ...this.erroresServidor(),
  }));

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) this.prepararFormulario();
      this.estabaAbierto = estaAbierto;
    });
  }

  private prepararFormulario(): void {
    const usuario = this.usuario();
    this.form.set(usuario ? usuarioFormDe(usuario) : { ...USUARIO_FORM_VACIO });
    this.intentoGuardar.set(false);
    this.guardando.set(false);
    this.errorGeneral.set('');
    this.erroresServidor.set({});
  }

  protected cambiar<K extends keyof UsuarioForm>(campo: K, valor: UsuarioForm[K]): void {
    this.form.update((actual) => ({ ...actual, [campo]: valor }));
    // Al corregir un campo se descarta el "ya registrado" que el servidor había marcado.
    if (this.erroresServidor()[campo]) {
      this.erroresServidor.update((actual) => {
        const resto = { ...actual };
        delete resto[campo];
        return resto;
      });
    }
  }

  protected cambiarTipoDocumento(valor: string): void {
    this.cambiar('tipoDocumento', valor as TipoDocumentoDto);
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected guardar(): void {
    this.intentoGuardar.set(true);
    this.errorGeneral.set('');
    const form = this.form();
    const modo = this.modo();
    if (Object.keys(validarUsuario(form, modo)).length > 0) return;

    const original = this.usuario();
    const peticion = original
      ? this.usuariosService.editar(original, form, form.rolId !== usuarioFormDe(original).rolId)
      : this.usuariosService.crear(form);

    this.guardando.set(true);
    peticion
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (usuario) => {
          this.saved.emit({ usuario, modo });
          this.closed.emit();
        },
        error: (error: unknown) => this.mostrarError(error),
      });
  }

  private mostrarError(error: unknown): void {
    const mensaje = apiErrorMessage(error, 'No se pudo guardar el usuario. Intente nuevamente.');
    const conflicto =
      error instanceof HttpErrorResponse && error.status === 409 ? conflictoDeCampo(mensaje) : null;

    if (conflicto) {
      this.erroresServidor.update((actual) => ({ ...actual, [conflicto.campo]: conflicto.texto }));
      return;
    }
    this.errorGeneral.set(mensaje);
  }
}
