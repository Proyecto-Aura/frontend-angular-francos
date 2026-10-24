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
import {
  CATEGORIA_LABEL,
  CategoriaCliente,
  Cliente,
  ClienteForm,
  TIPO_DOCUMENTO_LABEL,
  TipoDocumento,
  clienteAForm,
  clienteFormVacio,
  limpiarCamposDeOtroTipo,
  nombreCliente,
  tipoClientePorDocumento,
  validarClienteForm,
} from '../../interfaces/cliente.interface';
import { UbigeoItem } from '../../interfaces/ubicacion.interface';
import { ClienteService } from '../../services/cliente.service';
import { UbigeoService } from '../../services/ubigeo.service';

const MENSAJE_ERROR_GENERAL = 'No se pudo guardar el cliente. Intente nuevamente.';
const MENSAJE_ERROR_UBICACION =
  'No se pudo cargar la lista de ubicaciones. Cierre e intente nuevamente.';

// Ayuda bajo el número de documento, según el tipo elegido (mismos formatos que valida el backend).
const PISTA_DOCUMENTO: Record<TipoDocumento, string> = {
  dni: 'Debe tener 8 caracteres.',
  ruc: 'Debe tener 11 caracteres. RUC 10 = persona natural · RUC 20 = empresa.',
  ce: 'Debe tener de 9 a 12 letras o números.',
  pasaporte: 'Debe tener de 6 a 12 letras o números.',
};

const aOpciones = (items: UbigeoItem[]): SelectOption[] =>
  items.map((item) => ({ value: item.id, label: item.nombre }));

/** Alta y edición de clientes. Sin `cliente` registra uno nuevo; con `cliente` lo edita (PATCH). */
@Component({
  imports: [Button, Field, Icon, Input, Modal, Select],
  selector: 'app-cliente-form-modal',
  templateUrl: './cliente-form-modal.html',
})
export class ClienteFormModal {
  private clienteService = inject(ClienteService);
  private ubigeoService = inject(UbigeoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  /** null = modo alta. Con valor = modo edición (precarga y hace PATCH). */
  cliente = input<Cliente | null>(null);
  closed = output<void>();
  /** Emite el aviso a mostrar en la página cuando el backend confirma el guardado. */
  saved = output<string>();

  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;

  readonly documentoOptions: SelectOption[] = (
    Object.keys(TIPO_DOCUMENTO_LABEL) as TipoDocumento[]
  ).map((value) => ({ value, label: TIPO_DOCUMENTO_LABEL[value] }));

  readonly categoriaOptions: SelectOption[] = (
    Object.keys(CATEGORIA_LABEL) as CategoriaCliente[]
  ).map((value) => ({ value, label: CATEGORIA_LABEL[value] }));

  // Selects de ubicación en cascada: cada lista depende de la elección anterior.
  departamentoOptions = signal<SelectOption[]>([]);
  provinciaOptions = signal<SelectOption[]>([]);
  distritoOptions = signal<SelectOption[]>([]);

  f = signal<ClienteForm>(clienteFormVacio());
  errores = signal<string[]>([]);
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  modoEdicion = computed(() => this.cliente() !== null);
  titulo = computed(() => (this.modoEdicion() ? 'Editar cliente' : 'Registrar cliente'));
  pistaDocumento = computed(() => PISTA_DOCUMENTO[this.f().tipoDocumento]);
  tituloIcon = computed(() => (this.modoEdicion() ? LucidePencil : LucidePlus));
  esEmpresa = computed(
    () =>
      tipoClientePorDocumento(this.f().tipoDocumento, this.f().numeroDocumento.trim()) ===
      'empresa',
  );

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

  setCampo<K extends keyof ClienteForm>(campo: K, valor: ClienteForm[K]): void {
    this.f.update((actual) => ({ ...actual, [campo]: valor }));
  }

  onTipoDocumento(valor: string): void {
    this.actualizarDocumento({ tipoDocumento: valor as TipoDocumento });
  }

  onNumeroDocumento(valor: string): void {
    this.actualizarDocumento({ numeroDocumento: valor.replace(/\s/g, '') });
  }

  onCategoria(valor: string): void {
    this.setCampo('categoria', valor as CategoriaCliente);
  }

  // Al cambiar un nivel se vacían los de abajo y se carga la lista del siguiente.
  onDepartamento(valor: string): void {
    this.f.update((actual) => ({
      ...actual,
      departamentoId: valor,
      provinciaId: '',
      distritoId: '',
    }));
    this.provinciaOptions.set([]);
    this.distritoOptions.set([]);
    if (valor) {
      this.cargarProvincias(valor);
    }
  }

  onProvincia(valor: string): void {
    this.f.update((actual) => ({ ...actual, provinciaId: valor, distritoId: '' }));
    this.distritoOptions.set([]);
    if (valor) {
      this.cargarDistritos(valor);
    }
  }

  onDistrito(valor: string): void {
    this.setCampo('distritoId', valor);
  }

  guardar(): void {
    const form = this.f();
    const cliente = this.cliente();
    const errores = validarClienteForm(form, cliente !== null);

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (errores.length > 0) {
      return;
    }

    this.guardando.set(true);

    if (cliente) {
      this.clienteService
        .actualizar(cliente.id, form)
        .pipe(
          finalize(() => this.guardando.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (actualizado) =>
            this.terminar(`Cliente ${nombreCliente(actualizado)} actualizado.`),
          error: (error: unknown) => this.manejarError(error),
        });
      return;
    }

    this.clienteService
      .registrar(form)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (registrado) =>
          this.terminar(
            `Cliente registrado · cuenta ${registrado.usuario} creada con credenciales iniciales para ${registrado.email}.`,
          ),
        error: (error: unknown) => this.manejarError(error),
      });
  }

  // Cambiar el documento puede convertir a la persona en empresa (RUC 20) o al
  // revés: en ese caso se vacían los campos que el otro tipo no muestra.
  private actualizarDocumento(cambio: Partial<ClienteForm>): void {
    this.f.update((actual) => {
      const nuevo = { ...actual, ...cambio };
      const tipoAntes = tipoClientePorDocumento(
        actual.tipoDocumento,
        actual.numeroDocumento.trim(),
      );
      const tipoDespues = tipoClientePorDocumento(
        nuevo.tipoDocumento,
        nuevo.numeroDocumento.trim(),
      );
      return tipoAntes === tipoDespues ? nuevo : limpiarCamposDeOtroTipo(nuevo, tipoDespues);
    });
  }

  private terminar(aviso: string): void {
    this.saved.emit(aviso);
    this.closed.emit();
  }

  private inicializarFormulario(): void {
    const cliente = this.cliente();

    this.f.set(cliente ? clienteAForm(cliente) : clienteFormVacio());
    this.errores.set([]);
    this.errorGeneral.set(null);
    this.guardando.set(false);
    this.cargarUbicaciones(cliente);
  }

  // Los departamentos se piden una sola vez; en edición se precargan también las
  // provincias y distritos del cliente para que los selects muestren su elección.
  private cargarUbicaciones(cliente: Cliente | null): void {
    this.provinciaOptions.set([]);
    this.distritoOptions.set([]);

    if (this.departamentoOptions().length === 0) {
      this.ubigeoService
        .departamentos()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (items) => this.departamentoOptions.set(aOpciones(items)),
          error: () => this.errorGeneral.set(MENSAJE_ERROR_UBICACION),
        });
    }

    if (cliente?.ubicacion) {
      this.cargarProvincias(cliente.ubicacion.departamento.id);
      this.cargarDistritos(cliente.ubicacion.provincia.id);
    }
  }

  // Si el operador cambió de elección mientras la lista venía en camino, se descarta.
  private cargarProvincias(departamentoId: string): void {
    this.ubigeoService
      .provincias(departamentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (this.f().departamentoId === departamentoId) {
            this.provinciaOptions.set(aOpciones(items));
          }
        },
        error: () => this.errorGeneral.set(MENSAJE_ERROR_UBICACION),
      });
  }

  private cargarDistritos(provinciaId: string): void {
    this.ubigeoService
      .distritos(provinciaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (this.f().provinciaId === provinciaId) {
            this.distritoOptions.set(aOpciones(items));
          }
        },
        error: () => this.errorGeneral.set(MENSAJE_ERROR_UBICACION),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set(MENSAJE_ERROR_GENERAL);
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar clientes.');
      return;
    }

    // 409: documento o correo ya registrado, empresa sin razón social.
    // 400: validación del backend. En ambos casos el mensaje viene en español.
    if (error.status === 400 || error.status === 409) {
      const apiError = error.error as { message?: string | string[] } | null;
      const mensajes = Array.isArray(apiError?.message)
        ? apiError.message
        : apiError?.message
          ? [apiError.message]
          : [];
      this.errorGeneral.set(mensajes.join(' ') || MENSAJE_ERROR_GENERAL);
      return;
    }

    this.errorGeneral.set(MENSAJE_ERROR_GENERAL);
  }
}
