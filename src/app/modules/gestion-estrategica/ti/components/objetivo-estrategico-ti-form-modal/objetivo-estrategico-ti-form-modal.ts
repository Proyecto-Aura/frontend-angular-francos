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
import { LucideCheck, LucidePlus, LucideSearch } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Checkbox } from '../../../../../shared/ds/checkbox/checkbox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { ApiErrorDto } from '../../../negocio/interfaces/objetivo-estrategico-dto.interface';
import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../../negocio/interfaces/objetivo-estrategico.interface';
import {
  clasePuntoPerspectiva,
  claseTextoPerspectiva,
} from '../../../negocio/pages/tablero-control/tablero-control.reglas';
import {
  ObjetivoEstrategicoTi,
  ObjetivoEstrategicoTiForm,
} from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import {
  ObjetivoEstrategicoTiFormErrores,
  validarObjetivoTiForm,
} from './objetivo-estrategico-ti-form.validaciones';

@Component({
  imports: [Button, Checkbox, Field, Icon, Input, Modal, Select, Textarea],
  selector: 'app-objetivo-estrategico-ti-form-modal',
  templateUrl: './objetivo-estrategico-ti-form-modal.html',
})
export class ObjetivoEstrategicoTiFormModal {
  private objetivoService = inject(ObjetivoEstrategicoTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  planId = input<number | null>(null);
  planNombre = input('');
  objetivo = input<ObjetivoEstrategicoTi | null>(null);
  perspectivas = input<PerspectivaBsc[]>([]);
  objetivosDelPlan = input<ObjetivoEstrategicoTi[]>([]);
  objetivosNegocio = input<ObjetivoEstrategico[]>([]);
  perspectivaInicialId = input<number | null>(null);
  closed = output<void>();
  saved = output<ObjetivoEstrategicoTi>();

  readonly LucideCheck = LucideCheck;
  readonly LucidePlus = LucidePlus;
  readonly LucideSearch = LucideSearch;
  readonly clasePuntoPerspectiva = clasePuntoPerspectiva;
  readonly claseTextoPerspectiva = claseTextoPerspectiva;

  readonly nombre = signal('');
  readonly descripcion = signal('');
  readonly responsable = signal('');
  readonly perspectivaId = signal<number | null>(null);
  readonly oeNegocioIdTexto = signal('');
  readonly relacionesDestinoIds = signal<number[]>([]);
  readonly busquedaRelacion = signal('');
  readonly errores = signal<ObjetivoEstrategicoTiFormErrores>({});
  readonly errorRelaciones = signal<string | null>(null);
  readonly errorGeneral = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly modoEdicion = computed(() => this.objetivo() !== null);
  readonly titulo = computed(() =>
    this.modoEdicion() ? 'Editar objetivo estratégico de TI' : 'Nuevo objetivo estratégico de TI',
  );
  readonly perspectivasOrdenadas = computed(() =>
    [...this.perspectivas()].sort((a, b) => a.orden - b.orden),
  );
  readonly objetivosNegocioDisponibles = computed(() => {
    const vinculadoId = this.objetivo()?.oeNegocioId;
    return this.objetivosNegocio().filter(
      (objetivo) => objetivo.estadoCodigo !== 'CANCELADO' || objetivo.id === vinculadoId,
    );
  });
  readonly opcionesObjetivoNegocio = computed<SelectOption[]>(() =>
    this.objetivosNegocioDisponibles().map((objetivo) => ({
      value: String(objetivo.id),
      label: `${objetivo.codigo} · ${objetivo.nombre}`,
    })),
  );
  readonly objetivoNegocioSeleccionado = computed(() => {
    const id = this.aNumeroONull(this.oeNegocioIdTexto());
    return this.objetivosNegocio().find((objetivo) => objetivo.id === id) ?? null;
  });
  readonly hintObjetivoNegocio = computed(() => {
    const objetivo = this.objetivoNegocioSeleccionado();
    return objetivo
      ? `Perspectiva del objetivo de negocio: ${objetivo.perspectivaNombre}`
      : 'Alinea este objetivo de TI con la estrategia del negocio';
  });
  readonly objetivosRelacionables = computed(() => {
    const objetivoId = this.objetivo()?.id;
    return this.objetivosDelPlan().filter((objetivo) => objetivo.id !== objetivoId);
  });
  readonly objetivosRelacionablesFiltrados = computed(() => {
    const busqueda = this.normalizarTexto(this.busquedaRelacion().trim());
    if (!busqueda) return this.objetivosRelacionables();

    return this.objetivosRelacionables().filter(
      (objetivo) =>
        this.normalizarTexto(objetivo.nombre).includes(busqueda) ||
        this.normalizarTexto(objetivo.perspectivaNombre).includes(busqueda),
    );
  });
  readonly sinResultadosRelacion = computed(
    () =>
      this.busquedaRelacion().trim().length > 0 &&
      this.objetivosRelacionablesFiltrados().length === 0,
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
    const errores = validarObjetivoTiForm(form);
    this.errores.set(errores);
    this.errorRelaciones.set(null);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

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

  errorDe(campo: keyof ObjetivoEstrategicoTiFormErrores): string | null {
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

  private inicializarFormulario(): void {
    const objetivo = this.objetivo();
    this.nombre.set(objetivo?.nombre ?? '');
    this.descripcion.set(objetivo?.descripcion ?? '');
    this.responsable.set(objetivo?.responsable ?? '');
    this.perspectivaId.set(objetivo?.perspectivaId ?? this.perspectivaInicialId());
    this.oeNegocioIdTexto.set(objetivo?.oeNegocioId ? String(objetivo.oeNegocioId) : '');
    this.relacionesDestinoIds.set([...(objetivo?.relacionesDestinoIds ?? [])]);
    this.busquedaRelacion.set('');
    this.errores.set({});
    this.errorRelaciones.set(null);
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private formActual(): ObjetivoEstrategicoTiForm {
    return {
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      responsable: this.responsable(),
      perspectivaId: this.perspectivaId(),
      relacionesDestinoIds: this.relacionesDestinoIds(),
      oeNegocioId: this.aNumeroONull(this.oeNegocioIdTexto()),
    };
  }

  private aNumeroONull(valor: string): number | null {
    if (!valor) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
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
        nombre: 'Ya existe un objetivo de TI con este nombre en el plan.',
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

    if ((error.status === 409 || error.status === 404) && mensajeNormalizado.includes('negocio')) {
      this.errores.update((actuales) => ({ ...actuales, oeNegocioId: mensaje }));
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
      this.errorGeneral.set('No tiene permisos para gestionar objetivos estratégicos de TI.');
      return;
    }

    this.errorGeneral.set('No se pudo guardar el objetivo. Intente nuevamente.');
  }
}
