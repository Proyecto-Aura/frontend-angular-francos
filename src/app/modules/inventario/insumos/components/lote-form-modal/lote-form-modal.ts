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
import { LucideLayers } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Combobox } from '../../../../../shared/ds/combobox/combobox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { SelectOption } from '../../../../../shared/ds/select/select';
import { Insumo } from '../../interfaces/insumo.interface';
import { LoteInsumo, LoteInsumoForm } from '../../interfaces/lote-insumo.interface';
import { construirCodigoLote } from '../../mappers/lote-insumo.mapper';
import { InsumoService } from '../../services/insumo.service';
import { LoteInsumoService } from '../../services/lote-insumo.service';
import { LoteFormErrores, validarLoteForm } from './lote-form.validaciones';

// YYYY-MM-DD en hora local, no UTC — para que coincida con lo que vera la
// persona en pantalla y con [max] del <input type="date">.
function fechaIsoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

@Component({
  imports: [Button, Combobox, Field, Icon, Input, Modal],
  selector: 'app-lote-form-modal',
  templateUrl: './lote-form-modal.html',
})
export class LoteFormModal {
  private insumoService = inject(InsumoService);
  private loteService = inject(LoteInsumoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  closed = output<void>();
  saved = output<LoteInsumo>();

  readonly LucideLayers = LucideLayers;

  insumoId = signal('');
  fechaVencimiento = signal('');
  cantidadInicial = signal('');

  insumos = signal<Insumo[]>([]);
  insumosOptions = computed<SelectOption[]>(() =>
    this.insumos().map((insumo) => ({
      value: String(insumo.id),
      label: `${insumo.sku} · ${insumo.nombre}`,
    })),
  );
  insumoSeleccionado = computed(
    () => this.insumos().find((insumo) => String(insumo.id) === this.insumoId()) ?? null,
  );
  unidadInsumo = computed(() => this.insumoSeleccionado()?.unidadMedida ?? '');
  // Los insumos tipo empaque no vencen — confirmado con el backend que el
  // campo es libre para cualquier tipo, la regla de negocio la decide el
  // frontend. Sin insumo seleccionado todavia, por defecto true (la falta
  // de insumo ya se marca aparte con el error de insumoId).
  requiereFechaVencimiento = computed(() => this.insumoSeleccionado()?.tipo !== 'empaque');

  fechaIngresoHoy = computed(() => fechaIsoLocal(new Date()));
  fechaIngresoMostrada = computed(() =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(),
    ),
  );

  codigoLote = signal('');
  generandoCodigo = signal(false);

  errores = signal<LoteFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
        this.cargarInsumos();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionarInsumo(valor: string): void {
    this.insumoId.set(valor);
    this.regenerarCodigo();
    if (!this.requiereFechaVencimiento()) {
      this.fechaVencimiento.set('');
    }
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarLoteForm(form, this.requiereFechaVencimiento());

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0 || this.generandoCodigo() || !this.codigoLote()) {
      return;
    }

    this.guardando.set(true);
    this.loteService
      .registrar(form)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (lote) => {
          this.saved.emit(lote);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  errorDe(campo: keyof LoteFormErrores): string | null {
    return this.errores()[campo] ?? null;
  }

  private cargarInsumos(): void {
    // Limite alto para traer el catalogo completo de insumos activos en una
    // sola pagina — igual que el resto del formulario, pensado para el
    // tamano de catalogo actual.
    this.insumoService
      .listar(1, 100, { estado: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.insumos.set(pagina.insumos),
        error: () => this.insumos.set([]),
      });
  }

  private regenerarCodigo(): void {
    const insumoId = this.insumoId();
    if (!insumoId) {
      this.codigoLote.set('');
      return;
    }

    this.generandoCodigo.set(true);
    this.loteService
      .siguienteSecuencial(Number(insumoId))
      .pipe(
        finalize(() => this.generandoCodigo.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (secuencial) =>
          this.codigoLote.set(construirCodigoLote(secuencial, Number(insumoId))),
        error: () => this.codigoLote.set(''),
      });
  }

  private inicializarFormulario(): void {
    this.insumoId.set('');
    this.fechaVencimiento.set('');
    this.cantidadInicial.set('');
    this.codigoLote.set('');
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private formActual(): LoteInsumoForm {
    return {
      insumoId: this.insumoId(),
      codigoLote: this.codigoLote(),
      fechaIngreso: this.fechaIngresoHoy(),
      fechaVencimiento: this.fechaVencimiento(),
      cantidadInicial: this.cantidadInicial(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo registrar el lote. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para registrar lotes.');
      return;
    }

    const apiError = error.error as { message?: string | string[] } | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');
    const mensajeMin = mensaje.toLocaleLowerCase('es');

    if (error.status === 409 && mensajeMin.includes('vencimiento')) {
      this.errores.update((actuales) => ({ ...actuales, fechaVencimiento: mensaje }));
      return;
    }

    // Codigo duplicado (carrera entre dos registros del mismo insumo a la
    // vez): se regenera para que la persona pueda reintentar sin recargar
    // todo el formulario.
    if (error.status === 409 && (mensajeMin.includes('codigo') || mensajeMin.includes('lote'))) {
      this.errorGeneral.set('Ese código de lote ya existe. Generando uno nuevo…');
      this.regenerarCodigo();
      return;
    }

    if (error.status === 400 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo registrar el lote. Intente nuevamente.');
      return;
    }

    this.errorGeneral.set('No se pudo registrar el lote. Intente nuevamente.');
  }
}
