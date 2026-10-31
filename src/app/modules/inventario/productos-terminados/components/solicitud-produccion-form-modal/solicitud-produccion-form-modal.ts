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
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import {
  FilaDetalleSolicitudProduccionForm,
  SolicitudProduccion,
  SolicitudProduccionForm,
  filaDetalleSolicitudProduccionVacia,
} from '../../interfaces/solicitud-produccion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import { construirCodigoSolicitud } from '../../mappers/solicitud-produccion.mapper';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
import { SolicitudProduccionService } from '../../services/solicitud-produccion.service';
import {
  SolicitudProduccionFormErrores,
  validarSolicitudProduccionForm,
} from './solicitud-produccion-form.validaciones';

// Form de "Nueva solicitud a produccion" (OFT0-261) — conectado a
// POST /solicitudes-produccion. El catalogo de producto usa
// "productoTerminadoId" (no ProductoPresentacion.id, son dos PKs
// distintas — ver el comentario en ese interface) porque es lo que pide
// el body del backend, mismo criterio que
// MovimientoProductoTerminadoFormModal: se filtran del combobox los
// productos sin ese id resuelto (caso rarisimo).
@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal],
  selector: 'app-solicitud-produccion-form-modal',
  templateUrl: './solicitud-produccion-form-modal.html',
})
export class SolicitudProduccionFormModal {
  private productoService = inject(ProductoPresentacionService);
  private solicitudService = inject(SolicitudProduccionService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;

  open = input(false);
  closed = output<void>();
  saved = output<SolicitudProduccion>();

  readonly LucideCheck = LucideCheck;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;

  fechaLimite = signal('');
  filas = signal<FilaDetalleSolicitudProduccionForm[]>([]);

  productos = signal<ProductoPresentacion[]>([]);
  productosOptions = computed<SelectOption[]>(() =>
    this.productos().map((producto) => ({
      value: String(producto.productoTerminadoId),
      label: producto.productoNombre,
      secondary: producto.sku,
    })),
  );

  codigoPreview = signal('');
  generandoCodigo = signal(false);

  fechaSolicitudMostrada = computed(() =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(),
    ),
  );

  errores = signal<SolicitudProduccionFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
        this.cargarProductos();
        this.regenerarCodigo();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  agregarFila(): void {
    this.filas.update((filas) => [
      ...filas,
      filaDetalleSolicitudProduccionVacia(this.siguienteFilaId++),
    ]);
  }

  quitarFila(id: number): void {
    this.filas.update((filas) => filas.filter((fila) => fila.id !== id));
  }

  seleccionarProductoDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, productoTerminadoId: valor } : fila)),
    );
  }

  actualizarCantidadDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, cantidadSolicitada: valor } : fila)),
    );
  }

  productoDeFila(fila: FilaDetalleSolicitudProduccionForm): ProductoPresentacion | null {
    return (
      this.productos().find(
        (producto) => String(producto.productoTerminadoId) === fila.productoTerminadoId,
      ) ?? null
    );
  }

  presentacionDeFila(fila: FilaDetalleSolicitudProduccionForm): string {
    const producto = this.productoDeFila(fila);
    return producto
      ? etiquetaPresentacion(producto.presentacionCantidad, producto.presentacionUnidadMedida)
      : '—';
  }

  stockActualDeFila(fila: FilaDetalleSolicitudProduccionForm): string {
    const producto = this.productoDeFila(fila);
    return producto ? String(producto.stockActual) : '—';
  }

  stockMinimoDeFila(fila: FilaDetalleSolicitudProduccionForm): string {
    const producto = this.productoDeFila(fila);
    return producto ? String(producto.stockMinimo) : '—';
  }

  errorDeFila(id: number, campo: 'productoTerminadoId' | 'cantidadSolicitada'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const form: SolicitudProduccionForm = {
      fechaLimite: this.fechaLimite(),
      filas: this.filas(),
    };
    const errores = validarSolicitudProduccionForm(form);
    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0 || this.generandoCodigo() || !this.codigoPreview()) {
      return;
    }

    this.guardando.set(true);
    this.solicitudService
      .registrar(this.codigoPreview(), form)
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

  private cargarProductos(): void {
    // Limite alto para traer el catalogo completo en una sola pagina — se
    // filtran los que no tienen productoTerminadoId resuelto (caso
    // rarisimo, ver ProductoTerminadoDto).
    this.productoService
      .listar(1, 100, { estado: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) =>
          this.productos.set(pagina.productos.filter((p) => p.productoTerminadoId !== null)),
        error: () => this.productos.set([]),
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
        next: (secuencial) => this.codigoPreview.set(construirCodigoSolicitud(secuencial)),
        error: () => this.codigoPreview.set(''),
      });
  }

  private inicializarFormulario(): void {
    this.siguienteFilaId = 1;
    this.fechaLimite.set('');
    this.filas.set([filaDetalleSolicitudProduccionVacia(this.siguienteFilaId++)]);
    this.codigoPreview.set('');
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

    // Codigo duplicado (carrera entre dos altas casi simultaneas): se
    // regenera para que la persona pueda reintentar sin recargar el
    // formulario — mismo criterio que LoteFormModal.
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
