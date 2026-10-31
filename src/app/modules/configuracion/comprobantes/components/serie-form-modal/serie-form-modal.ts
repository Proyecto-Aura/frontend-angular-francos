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
import { TipoComprobanteDto } from '../../interfaces/serie-comprobante-dto.interface';
import {
  CORRELATIVO_MAXIMO,
  SERIE_FORM_VACIO,
  SerieComprobante,
  SerieErrores,
  SerieForm,
  TIPOS_COMPROBANTE,
  conflictoDeCampo,
  etiquetaDeTipo,
  formatearCorrelativo,
  prefijoDeTipo,
  serieFormDe,
  validarSerie,
  yaEmitio,
} from '../../interfaces/serie-comprobante.interface';
import { SeriesComprobanteService } from '../../services/series-comprobante.service';

export interface SerieGuardada {
  serie: SerieComprobante;
  modo: 'nueva' | 'editar';
}

const TEXTO_BLOQUEADO = 'No editable: la serie ya tiene emisiones';

@Component({
  imports: [Button, Field, Input, Modal, Select, Switch],
  selector: 'app-serie-form-modal',
  templateUrl: './serie-form-modal.html',
})
export class SerieFormModal {
  private seriesService = inject(SeriesComprobanteService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  /** null = crear una serie nueva. */
  serie = input<SerieComprobante | null>(null);
  closed = output<void>();
  saved = output<SerieGuardada>();

  protected readonly tipos: SelectOption[] = TIPOS_COMPROBANTE;
  protected readonly maximo = CORRELATIVO_MAXIMO;

  readonly form = signal<SerieForm>({ ...SERIE_FORM_VACIO });
  readonly intentoGuardar = signal(false);
  readonly guardando = signal(false);
  readonly errorGeneral = signal('');
  private readonly erroresServidor = signal<SerieErrores>({});

  protected readonly modo = computed<'nueva' | 'editar'>(() => (this.serie() ? 'editar' : 'nueva'));
  /** Una serie que ya emitió solo admite ampliar el correlativo final. */
  protected readonly bloqueada = computed(() => yaEmitio(this.serie()));

  protected readonly titulo = computed(() => {
    const serie = this.serie();
    return serie ? `Editar serie ${serie.codigo}` : 'Nueva serie';
  });
  protected readonly descripcion = computed(() => {
    const serie = this.serie();
    return serie ? etiquetaDeTipo(this.form().tipo) : 'Serie autorizada para emisión electrónica';
  });
  protected readonly pistaBloqueo = computed(() => (this.bloqueada() ? TEXTO_BLOQUEADO : null));
  protected readonly pistaSerie = computed(
    () => this.pistaBloqueo() ?? `Inicia con ${prefijoDeTipo(this.form().tipo)}`,
  );
  protected readonly ejemploSerie = computed(() => `${prefijoDeTipo(this.form().tipo)}001`);
  protected readonly proximo = computed(() => {
    const serie = this.serie();
    if (!serie) return '';
    return serie.siguiente === null
      ? 'Rango agotado'
      : `${serie.codigo}-${formatearCorrelativo(serie.siguiente)}`;
  });

  protected readonly errores = computed<SerieErrores>(() => ({
    ...(this.intentoGuardar() ? validarSerie(this.form(), this.serie()) : {}),
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
    const serie = this.serie();
    this.form.set(serie ? serieFormDe(serie) : { ...SERIE_FORM_VACIO });
    this.intentoGuardar.set(false);
    this.guardando.set(false);
    this.errorGeneral.set('');
    this.erroresServidor.set({});
  }

  protected cambiar<K extends keyof SerieForm>(campo: K, valor: SerieForm[K]): void {
    this.form.update((actual) => ({ ...actual, [campo]: valor }));
    // Al corregir un campo se descarta el "ya existe" que el servidor había marcado.
    if (this.erroresServidor()[campo]) {
      this.erroresServidor.update((actual) => {
        const resto = { ...actual };
        delete resto[campo];
        return resto;
      });
    }
  }

  protected cambiarTipo(valor: string): void {
    this.cambiar('tipo', valor as TipoComprobanteDto);
  }

  protected cambiarSerie(valor: string): void {
    this.cambiar('serie', valor.toUpperCase());
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected guardar(): void {
    this.intentoGuardar.set(true);
    this.errorGeneral.set('');
    const form = this.form();
    const original = this.serie();
    if (Object.keys(validarSerie(form, original)).length > 0) return;

    const modo = this.modo();
    const peticion = original
      ? this.seriesService.editar(original, form)
      : this.seriesService.crear(form);

    this.guardando.set(true);
    peticion
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (serie) => {
          this.saved.emit({ serie, modo });
          this.closed.emit();
        },
        error: (error: unknown) => this.mostrarError(error),
      });
  }

  private mostrarError(error: unknown): void {
    const mensaje = apiErrorMessage(error, 'No se pudo guardar la serie. Intente nuevamente.');
    const conflicto =
      error instanceof HttpErrorResponse && error.status === 409 ? conflictoDeCampo(mensaje) : null;

    if (conflicto) {
      this.erroresServidor.update((actual) => ({ ...actual, [conflicto.campo]: conflicto.texto }));
      return;
    }
    this.errorGeneral.set(mensaje);
  }
}
