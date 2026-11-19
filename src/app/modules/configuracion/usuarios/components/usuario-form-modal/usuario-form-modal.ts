import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, of, switchMap } from 'rxjs';
import { LucideEye, LucideEyeClosed, LucideUpload } from '@lucide/angular';

import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
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
  mismosRoles,
  usuarioFormDe,
  validarFoto,
  validarUsuario,
} from '../../interfaces/usuario.interface';
import { UsuariosService } from '../../services/usuarios.service';

export interface UsuarioGuardado {
  usuario: Usuario;
  modo: 'nuevo' | 'editar';
}

/** Fecha local (no UTC: toISOString() se adelanta de día en las tardes/noches en Perú). */
function fechaDeHoy(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Sin 0/O/1/l/I para que no se confundan al transcribirla a mano.
const CARACTERES_CONTRASENA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

function generarContrasenaSegura(longitud = 12): string {
  const valores = new Uint32Array(longitud);
  crypto.getRandomValues(valores);
  return Array.from(valores, (v) => CARACTERES_CONTRASENA[v % CARACTERES_CONTRASENA.length]).join(
    '',
  );
}

@Component({
  imports: [Alert, Button, Field, Icon, Input, Modal, Select, Switch],
  selector: 'app-usuario-form-modal',
  templateUrl: './usuario-form-modal.html',
})
export class UsuarioFormModal {
  private usuariosService = inject(UsuariosService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  protected readonly LucideUpload = LucideUpload;

  passwordVisible = signal(false);
  protected readonly ojoIcono = computed(() =>
    this.passwordVisible() ? LucideEyeClosed : LucideEye,
  );

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

  protected readonly errores = computed<UsuarioErrores>(() => ({
    ...(this.intentoGuardar() ? validarUsuario(this.form(), this.modo()) : {}),
    ...this.erroresServidor(),
  }));

  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  private alertaTimer: ReturnType<typeof setTimeout> | null = null;
  private limpiarAlerta(): void {
    if (this.alertaTimer) clearTimeout(this.alertaTimer);
    this.alertaTimer = null;
    this.errorGeneral.set('');
    this.toast.set(null);
  }
  private mostrarAlerta(tone: AlertTone, title: string, description?: string): void {
    this.limpiarAlerta();
    this.toast.set({ tone, title, description });
    this.alertaTimer = setTimeout(() => this.limpiarAlerta(), 4500);
  }
  private mostrarMensajeError(mensaje: string): void {
    this.mostrarAlerta('error', mensaje);
    this.errorGeneral.set(mensaje);
  }

  // Foto: la ya guardada, la recién elegida (aún sin subir) y si se pidió quitarla.
  // Se puede elegir también al crear: guardar() sube la foto recién después, con el
  // id real que devuelve el alta (ver el switchMap más abajo).
  private selectorArchivo = viewChild<ElementRef<HTMLInputElement>>('selectorArchivo');
  fotoGuardada = signal<string | null>(null);
  fotoArchivo = signal<File | null>(null);
  fotoPrevia = signal<string | null>(null);
  fotoQuitada = signal(false);
  fotoError = signal('');

  protected fotoVisible = computed(() =>
    this.fotoQuitada() ? null : (this.fotoPrevia() ?? this.fotoGuardada()),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.limpiarAlerta();
      this.liberarPrevia();
    });
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) this.prepararFormulario();
      this.estabaAbierto = estaAbierto;
    });
  }

  private prepararFormulario(): void {
    const usuario = this.usuario();
    this.form.set(
      usuario ? usuarioFormDe(usuario) : { ...USUARIO_FORM_VACIO, fechaIngreso: fechaDeHoy() },
    );
    this.intentoGuardar.set(false);
    this.guardando.set(false);
    this.limpiarAlerta();
    this.erroresServidor.set({});
    this.passwordVisible.set(false);

    this.liberarPrevia();
    this.fotoGuardada.set(usuario?.fotoUrl ?? null);
    this.fotoArchivo.set(null);
    this.fotoQuitada.set(false);
    this.fotoError.set('');
  }

  protected elegirFoto(): void {
    this.selectorArchivo()?.nativeElement.click();
  }

  protected alElegirArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    // Permite volver a elegir el mismo archivo después.
    entrada.value = '';
    if (!archivo) return;

    const error = validarFoto(archivo);
    if (error) {
      this.fotoError.set(error);
      this.mostrarAlerta('warning', 'Foto no válida', error);
      return;
    }

    this.fotoError.set('');
    this.liberarPrevia();
    this.fotoArchivo.set(archivo);
    this.fotoPrevia.set(URL.createObjectURL(archivo));
    this.fotoQuitada.set(false);
  }

  protected quitarFotoSeleccion(): void {
    this.liberarPrevia();
    this.fotoArchivo.set(null);
    this.fotoError.set('');
    // Solo hay que avisarle al servidor si ya había una foto guardada.
    this.fotoQuitada.set(this.fotoGuardada() !== null);
  }

  private liberarPrevia(): void {
    const previa = this.fotoPrevia();
    if (previa) URL.revokeObjectURL(previa);
    this.fotoPrevia.set(null);
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

  protected togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
  }

  /** Usuario a partir del documento (ya validado con su formato) y una contraseña aleatoria. */
  protected autogenerarCredenciales(): void {
    const documento = this.form().numeroDocumento.trim();
    if (documento) this.cambiar('username', documento.toLowerCase());
    this.cambiar('contrasena', generarContrasenaSegura());
    this.passwordVisible.set(true);
  }

  protected tieneRol(rolId: number): boolean {
    return this.form().rolIds.includes(String(rolId));
  }

  protected alternarRol(rolId: number, activo: boolean): void {
    const id = String(rolId);
    const actuales = this.form().rolIds;
    this.cambiar('rolIds', activo ? [...actuales, id] : actuales.filter((r) => r !== id));
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected guardar(): void {
    this.intentoGuardar.set(true);
    this.limpiarAlerta();
    const form = this.form();
    const modo = this.modo();
    if (Object.keys(validarUsuario(form, modo)).length > 0) {
      this.mostrarAlerta(
        'warning',
        'Faltan campos por completar',
        'Revisa los campos marcados antes de guardar.',
      );
      return;
    }

    const original = this.usuario();
    const peticion = original
      ? this.usuariosService.editar(
          original,
          form,
          !mismosRoles(form.rolIds, usuarioFormDe(original).rolIds),
        )
      : this.usuariosService.crear(form);

    const archivo = this.fotoArchivo();
    const quitar = this.fotoQuitada();

    this.guardando.set(true);
    peticion
      .pipe(
        // Si la foto falla después, los datos del usuario ya quedaron guardados.
        switchMap((usuario): Observable<Usuario> => {
          if (archivo) return this.usuariosService.subirFoto(usuario.id, archivo);
          if (quitar) return this.usuariosService.quitarFoto(usuario.id);
          return of(usuario);
        }),
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
      this.mostrarMensajeError(mensaje);
      return;
    }
    this.mostrarMensajeError(mensaje);
  }
}
