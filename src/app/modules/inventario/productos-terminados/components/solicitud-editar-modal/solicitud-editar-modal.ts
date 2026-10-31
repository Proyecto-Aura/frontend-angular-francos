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
import { LucideCheck, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { Observable, Subscription, finalize, forkJoin } from 'rxjs';
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
  FilaEditarSolicitudProduccion,
  SolicitudProduccion,
  SolicitudProduccionForm,
} from '../../interfaces/solicitud-produccion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import { calcularCambiosSolicitudProduccion } from '../../mappers/solicitud-produccion.mapper';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
import { SolicitudProduccionService } from '../../services/solicitud-produccion.service';
import {
  SolicitudProduccionFormErrores,
  validarSolicitudProduccionForm,
} from '../solicitud-produccion-form-modal/solicitud-produccion-form.validaciones';

// "Editar solicitud a produccion" (OFT0-261) — pedido del usuario como
// "casi el mismo" que el form de alta (mismo layout: codigo a la izquierda
// de las fechas, misma tabla de productos), pero con el codigo
// desactivado/prefijado (no se vuelve a generar) y "Guardar cambios" en vez
// de "Crear solicitud". Es un componente aparte (no una variante del de
// alta) porque el guardado es completamente distinto: el backend no tiene
// un endpoint combinado de edicion (confirmado) — "Guardar cambios" compara
// el snapshot con el que se abrio el modal contra el form actual
// (calcularCambiosSolicitudProduccion) y dispara, en paralelo, solo las
// llamadas que hacen falta:
// - fecha_limite cambio -> PATCH /solicitudes-produccion/:id
// - cantidad de una fila existente cambio -> PATCH .../detalle/:detalleId
// - fila nueva (detalleId null) -> POST .../:id/detalle
// - fila existente quitada -> DELETE .../detalle/:detalleId
// Todo 409 si la solicitud ya no esta "pendiente" — el llamador (la pagina)
// solo abre este modal para solicitudes pendientes (ver el icono
// "Editar" deshabilitado en otro estado).
//
// El producto de una fila YA EXISTENTE no se puede cambiar (el backend solo
// permite editar la cantidad de una linea, no su producto) — el combobox
// se deshabilita para esas filas; solo las filas nuevas pueden elegir
// producto libremente.
@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal],
  selector: 'app-solicitud-editar-modal',
  templateUrl: './solicitud-editar-modal.html',
})
export class SolicitudEditarModal {
  private productoService = inject(ProductoPresentacionService);
  private solicitudService = inject(SolicitudProduccionService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;
  private siguienteFilaId = 1;

  // Snapshot con el que se abrio el modal — contra esto se calcula el diff
  // al guardar, no contra lo que haya devuelto el ultimo GET (que no se
  // vuelve a pedir mientras el modal esta abierto).
  private fechaLimiteOriginal = '';
  private detalleIdsOriginales: number[] = [];

  /** null = cerrado. */
  solicitudId = input<number | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly LucideCheck = LucideCheck;
  readonly LucidePencil = LucidePencil;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;

  codigo = signal('');
  fechaSolicitudMostrada = signal('');
  fechaLimite = signal('');
  filas = signal<FilaEditarSolicitudProduccion[]>([]);

  productos = signal<ProductoPresentacion[]>([]);
  productosOptions = computed<SelectOption[]>(() =>
    this.productos().map((producto) => ({
      value: String(producto.productoTerminadoId),
      label: producto.productoNombre,
      secondary: producto.sku,
    })),
  );

  cargandoDatos = signal(false);
  errorCarga = signal(false);

  titulo = computed(() =>
    this.codigo() ? `Editar solicitud ${this.codigo()}` : 'Editar solicitud',
  );

  errores = signal<SolicitudProduccionFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    effect(() => {
      const id = this.solicitudId();
      if (id !== null) {
        this.cargar(id);
      }
    });
  }

  cargar(id: number): void {
    this.cargaSub?.unsubscribe();
    this.errorGeneral.set(null);
    this.errores.set({});
    this.cargandoDatos.set(true);
    this.errorCarga.set(false);

    this.cargaSub = forkJoin({
      solicitud: this.solicitudService.obtener(id),
      productos: this.productoService.listar(1, 100, { estado: true }),
    })
      .pipe(
        finalize(() => this.cargandoDatos.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ solicitud, productos }) => {
          this.inicializarDesde(solicitud);
          this.productos.set(productos.productos.filter((p) => p.productoTerminadoId !== null));
        },
        error: () => this.errorCarga.set(true),
      });
  }

  reintentar(): void {
    const id = this.solicitudId();
    if (id !== null) {
      this.cargar(id);
    }
  }

  agregarFila(): void {
    this.filas.update((filas) => [
      ...filas,
      {
        id: this.siguienteFilaId++,
        detalleId: null,
        productoTerminadoId: '',
        cantidadSolicitada: '0',
        cantidadOriginal: null,
      },
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

  productoDeFila(fila: FilaEditarSolicitudProduccion): ProductoPresentacion | null {
    return (
      this.productos().find(
        (producto) => String(producto.productoTerminadoId) === fila.productoTerminadoId,
      ) ?? null
    );
  }

  presentacionDeFila(fila: FilaEditarSolicitudProduccion): string {
    const producto = this.productoDeFila(fila);
    return producto
      ? etiquetaPresentacion(producto.presentacionCantidad, producto.presentacionUnidadMedida)
      : '—';
  }

  stockActualDeFila(fila: FilaEditarSolicitudProduccion): string {
    const producto = this.productoDeFila(fila);
    return producto ? String(producto.stockActual) : '—';
  }

  stockMinimoDeFila(fila: FilaEditarSolicitudProduccion): string {
    const producto = this.productoDeFila(fila);
    return producto ? String(producto.stockMinimo) : '—';
  }

  errorDeFila(id: number, campo: 'productoTerminadoId' | 'cantidadSolicitada'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const id = this.solicitudId();
    if (id === null) return;

    const form: SolicitudProduccionForm = { fechaLimite: this.fechaLimite(), filas: this.filas() };
    const errores = validarSolicitudProduccionForm(form);
    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

    const cambios = calcularCambiosSolicitudProduccion(
      this.fechaLimiteOriginal,
      this.fechaLimite(),
      this.detalleIdsOriginales,
      this.filas(),
    );

    const llamadas: Observable<void>[] = [];
    if (cambios.fechaLimite !== null) {
      llamadas.push(this.solicitudService.actualizarFechaLimite(id, cambios.fechaLimite));
    }
    cambios.altas.forEach((item) => llamadas.push(this.solicitudService.agregarDetalle(id, item)));
    cambios.actualizaciones.forEach((actualizacion) =>
      llamadas.push(
        this.solicitudService.actualizarCantidadDetalle(
          actualizacion.detalleId,
          actualizacion.cantidadSolicitada,
        ),
      ),
    );
    cambios.bajas.forEach((detalleId) =>
      llamadas.push(this.solicitudService.eliminarDetalle(detalleId)),
    );

    if (llamadas.length === 0) {
      this.closed.emit();
      return;
    }

    this.guardando.set(true);
    forkJoin(llamadas)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.emit();
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.codigo.set('');
    this.fechaSolicitudMostrada.set('');
    this.fechaLimite.set('');
    this.filas.set([]);
    this.productos.set([]);
    this.errorCarga.set(false);
    this.errores.set({});
    this.errorGeneral.set(null);
    this.closed.emit();
  }

  private inicializarDesde(solicitud: SolicitudProduccion): void {
    this.siguienteFilaId = 1;
    this.codigo.set(solicitud.codigo);
    this.fechaSolicitudMostrada.set(this.formatearFecha(solicitud.fechaCreacion));
    this.fechaLimiteOriginal = solicitud.fechaLimite?.slice(0, 10) ?? '';
    this.fechaLimite.set(this.fechaLimiteOriginal);
    this.detalleIdsOriginales = solicitud.detalle.map((d) => d.id);
    this.filas.set(
      solicitud.detalle.map((d) => ({
        id: this.siguienteFilaId++,
        detalleId: d.id,
        productoTerminadoId: String(d.productoTerminadoId),
        cantidadSolicitada: String(d.cantidadSolicitada),
        cantidadOriginal: String(d.cantidadSolicitada),
      })),
    );
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudieron guardar los cambios. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para editar esta solicitud.');
      return;
    }

    if (error.status === 409) {
      this.errorGeneral.set(
        'La solicitud ya cambió de estado y no se puede editar. Cierre y vuelva a abrirla.',
      );
      return;
    }

    const apiError = error.error as { message?: string | string[] } | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    this.errorGeneral.set(
      mensajes.join(' ') || 'No se pudieron guardar los cambios. Intente nuevamente.',
    );
  }

  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(anio, mes - 1, dia));
  }
}
