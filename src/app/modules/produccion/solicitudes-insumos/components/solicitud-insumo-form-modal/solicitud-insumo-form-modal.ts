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
import { LucideCheck, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Combobox } from '../../../../../shared/ds/combobox/combobox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { SelectOption } from '../../../../../shared/ds/select/select';
import { Insumo } from '../../interfaces/insumo.interface';
import { SolicitudProduccionOpcion } from '../../interfaces/solicitud-produccion-opcion.interface';
import {
  FilaDetalleSolicitudInsumoForm,
  SolicitudInsumo,
  SolicitudInsumoForm,
  filaDetalleSolicitudInsumoVacia,
} from '../../interfaces/solicitud-insumo.interface';
import { construirCodigoSolicitudInsumo } from '../../mappers/solicitud-insumo.mapper';
import { InsumoService } from '../../services/insumo.service';
import { SolicitudInsumoService } from '../../services/solicitud-insumo.service';
import { SolicitudProduccionOpcionService } from '../../services/solicitud-produccion-opcion.service';
import {
  SolicitudInsumoFormErrores,
  validarSolicitudInsumoForm,
} from './solicitud-insumo-form.validaciones';

// Form de "Nueva solicitud de insumos" (OFT0-264) — conectado a
// POST /produccion/solicitudes-insumos. Mismo patron que
// SolicitudProduccionFormModal de Inventario, adaptado al catalogo de
// insumos (sin "presentacion": un insumo tiene nombre + unidad de medida
// directamente, a diferencia de un producto terminado). Incluye ademas el
// buscador opcional de "Solicitud de producción" (solicitud_produccion_id)
// para vincular esta solicitud de insumos a una solicitud de producción
// en proceso puntual — pedido explicito del usuario.
@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal],
  selector: 'app-solicitud-insumo-form-modal',
  templateUrl: './solicitud-insumo-form-modal.html',
})
export class SolicitudInsumoFormModal {
  private insumoService = inject(InsumoService);
  private solicitudService = inject(SolicitudInsumoService);
  private solicitudProduccionService = inject(SolicitudProduccionOpcionService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;

  open = input(false);
  closed = output<void>();
  saved = output<SolicitudInsumo>();

  readonly LucideCheck = LucideCheck;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;

  fechaLimite = signal('');
  filas = signal<FilaDetalleSolicitudInsumoForm[]>([]);

  insumos = signal<Insumo[]>([]);
  insumosOptions = computed<SelectOption[]>(() =>
    this.insumos().map((insumo) => ({
      value: String(insumo.id),
      label: insumo.nombre,
      secondary: insumo.sku,
    })),
  );

  // Buscador de "Solicitud de producción" (opcional, OFT0-264): vincula la
  // solicitud de insumos a una solicitud de producción en proceso puntual
  // (solicitud_produccion_id) — pedido explicito del usuario. Solo se
  // ofrecen las que ya estan "en_proceso", mismo criterio que el buscador
  // analogo de "Agregar lote" en el modulo solicitudes-produccion.
  solicitudesProduccion = signal<SolicitudProduccionOpcion[]>([]);
  solicitudesProduccionOptions = computed<SelectOption[]>(() =>
    this.solicitudesProduccion().map((s) => ({ value: String(s.id), label: s.codigo })),
  );
  solicitudProduccionId = signal('');

  codigoPreview = signal('');
  generandoCodigo = signal(false);

  fechaSolicitudMostrada = computed(() =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(),
    ),
  );

  errores = signal<SolicitudInsumoFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
        this.cargarInsumos();
        this.cargarSolicitudesProduccion();
        this.regenerarCodigo();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionarSolicitudProduccion(valor: string): void {
    this.solicitudProduccionId.set(valor);
  }

  agregarFila(): void {
    this.filas.update((filas) => [
      ...filas,
      filaDetalleSolicitudInsumoVacia(this.siguienteFilaId++),
    ]);
  }

  quitarFila(id: number): void {
    this.filas.update((filas) => filas.filter((fila) => fila.id !== id));
  }

  seleccionarInsumoDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, insumoId: valor } : fila)),
    );
  }

  actualizarCantidadDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, cantidadSolicitada: valor } : fila)),
    );
  }

  insumoDeFila(fila: FilaDetalleSolicitudInsumoForm): Insumo | null {
    return this.insumos().find((insumo) => String(insumo.id) === fila.insumoId) ?? null;
  }

  unidadMedidaDeFila(fila: FilaDetalleSolicitudInsumoForm): string {
    return this.insumoDeFila(fila)?.unidadMedida ?? '—';
  }

  stockActualDeFila(fila: FilaDetalleSolicitudInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    return insumo ? String(insumo.stockActual) : '—';
  }

  stockMinimoDeFila(fila: FilaDetalleSolicitudInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    return insumo ? String(insumo.stockMinimo) : '—';
  }

  errorDeFila(id: number, campo: 'insumoId' | 'cantidadSolicitada'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const form: SolicitudInsumoForm = {
      fechaLimite: this.fechaLimite(),
      filas: this.filas(),
    };
    const errores = validarSolicitudInsumoForm(form);
    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0 || this.generandoCodigo() || !this.codigoPreview()) {
      return;
    }

    this.guardando.set(true);
    const solicitudProduccionId = this.solicitudProduccionId()
      ? Number(this.solicitudProduccionId())
      : undefined;
    this.solicitudService
      .registrar(this.codigoPreview(), form, solicitudProduccionId)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (solicitud) => {
          this.saved.emit(solicitud);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private cargarInsumos(): void {
    this.insumoService
      .listar(1, 100, { estado: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.insumos.set(pagina.insumos),
        error: () => this.insumos.set([]),
      });
  }

  private cargarSolicitudesProduccion(): void {
    this.solicitudProduccionService
      .listar(1, 100, { estado: 'en_proceso' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opciones) => this.solicitudesProduccion.set(opciones),
        error: () => this.solicitudesProduccion.set([]),
      });
  }

  private regenerarCodigo(): void {
    this.generandoCodigo.set(true);
    this.solicitudService
      .siguienteSecuencial()
      .pipe(
        finalize(() => this.generandoCodigo.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (secuencial) => this.codigoPreview.set(construirCodigoSolicitudInsumo(secuencial)),
        error: () => this.codigoPreview.set(''),
      });
  }

  private inicializarFormulario(): void {
    this.siguienteFilaId = 1;
    this.fechaLimite.set('');
    this.filas.set([filaDetalleSolicitudInsumoVacia(this.siguienteFilaId++)]);
    this.codigoPreview.set('');
    this.solicitudProduccionId.set('');
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo crear la solicitud. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para crear solicitudes.');
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

    if (error.status === 409 && mensajeMin.includes('codigo')) {
      this.errorGeneral.set('Ese código de solicitud ya existe. Generando uno nuevo…');
      this.regenerarCodigo();
      return;
    }

    if (error.status === 400 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo crear la solicitud. Intente nuevamente.');
      return;
    }

    this.errorGeneral.set('No se pudo crear la solicitud. Intente nuevamente.');
  }
}
