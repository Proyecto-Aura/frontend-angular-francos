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
import { Insumo } from '../../interfaces/insumo.interface';
import { SolicitudProduccionOpcion } from '../../interfaces/solicitud-produccion-opcion.interface';
import {
  FilaEditarSolicitudInsumo,
  SolicitudInsumo,
  SolicitudInsumoForm,
} from '../../interfaces/solicitud-insumo.interface';
import { calcularCambiosSolicitudInsumo } from '../../mappers/solicitud-insumo.mapper';
import { InsumoService } from '../../services/insumo.service';
import { SolicitudInsumoService } from '../../services/solicitud-insumo.service';
import { SolicitudProduccionOpcionService } from '../../services/solicitud-produccion-opcion.service';
import {
  SolicitudInsumoFormErrores,
  validarSolicitudInsumoForm,
} from '../solicitud-insumo-form-modal/solicitud-insumo-form.validaciones';

// "Editar solicitud de insumos" (OFT0-264) — mismo patron que
// SolicitudEditarModal de Inventario: el codigo va desactivado/prefijado
// (no se vuelve a generar) y "Guardar cambios" en vez de "Crear solicitud".
// No hay endpoint combinado de edicion (mismo criterio que solicitud de
// produccion) — "Guardar cambios" compara el snapshot con el que se abrio
// el modal contra el form actual (calcularCambiosSolicitudInsumo) y
// dispara, en paralelo, solo las llamadas que hacen falta. Todo 409 si la
// solicitud ya no esta "pendiente".
//
// El insumo de una fila YA EXISTENTE no se puede cambiar (mismo criterio
// que producto en solicitud de produccion: el backend solo permite editar
// la cantidad de una linea existente, no su insumo) — el combobox se
// deshabilita para esas filas; solo las filas nuevas pueden elegir insumo
// libremente.
//
// "Solicitud de producción" tambien se muestra aca (pedido explicito del
// usuario), pero SOLO informativo/desactivado — el backend no da forma de
// cambiar solicitud_produccion_id despues de creada la solicitud.
@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal],
  selector: 'app-solicitud-insumo-editar-modal',
  templateUrl: './solicitud-insumo-editar-modal.html',
})
export class SolicitudInsumoEditarModal {
  private insumoService = inject(InsumoService);
  private solicitudService = inject(SolicitudInsumoService);
  private solicitudProduccionOpcionService = inject(SolicitudProduccionOpcionService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;
  private siguienteFilaId = 1;

  // Snapshot con el que se abrio el modal — contra esto se calcula el diff
  // al guardar.
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
  // Solo informativo — el backend no da un endpoint para cambiar
  // solicitud_produccion_id despues de creada la solicitud (pedido
  // explicito del usuario: mostrarlo aca, igual que "Código de solicitud",
  // desactivado). '—' cuando la solicitud no nacio de ninguna.
  solicitudProduccionCodigo = signal('—');
  fechaLimite = signal('');
  filas = signal<FilaEditarSolicitudInsumo[]>([]);

  insumos = signal<Insumo[]>([]);
  insumosOptions = computed<SelectOption[]>(() =>
    this.insumos().map((insumo) => ({
      value: String(insumo.id),
      label: insumo.nombre,
      secondary: insumo.sku,
    })),
  );

  cargandoDatos = signal(false);
  errorCarga = signal(false);

  titulo = computed(() =>
    this.codigo() ? `Editar solicitud ${this.codigo()}` : 'Editar solicitud',
  );

  errores = signal<SolicitudInsumoFormErrores>({});
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
      insumos: this.insumoService.listar(1, 100, { estado: true }),
      // Sin filtro de estado: la solicitud de produccion vinculada puede ya
      // no estar "en_proceso" para cuando se edita esta solicitud de
      // insumos — se busca igual para mostrar su codigo.
      solicitudesProduccion: this.solicitudProduccionOpcionService.listar(1, 100, {}),
    })
      .pipe(
        finalize(() => this.cargandoDatos.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ solicitud, insumos, solicitudesProduccion }) => {
          this.inicializarDesde(solicitud, solicitudesProduccion);
          this.insumos.set(insumos.insumos);
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
        insumoId: '',
        cantidadSolicitada: '0',
        cantidadOriginal: null,
      },
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

  insumoDeFila(fila: FilaEditarSolicitudInsumo): Insumo | null {
    return this.insumos().find((insumo) => String(insumo.id) === fila.insumoId) ?? null;
  }

  unidadMedidaDeFila(fila: FilaEditarSolicitudInsumo): string {
    return this.insumoDeFila(fila)?.unidadMedida ?? '—';
  }

  stockActualDeFila(fila: FilaEditarSolicitudInsumo): string {
    const insumo = this.insumoDeFila(fila);
    return insumo ? String(insumo.stockActual) : '—';
  }

  stockMinimoDeFila(fila: FilaEditarSolicitudInsumo): string {
    const insumo = this.insumoDeFila(fila);
    return insumo ? String(insumo.stockMinimo) : '—';
  }

  errorDeFila(id: number, campo: 'insumoId' | 'cantidadSolicitada'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const id = this.solicitudId();
    if (id === null) return;

    const form: SolicitudInsumoForm = { fechaLimite: this.fechaLimite(), filas: this.filas() };
    const errores = validarSolicitudInsumoForm(form);
    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

    const cambios = calcularCambiosSolicitudInsumo(
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
    this.solicitudProduccionCodigo.set('—');
    this.fechaLimite.set('');
    this.filas.set([]);
    this.insumos.set([]);
    this.errorCarga.set(false);
    this.errores.set({});
    this.errorGeneral.set(null);
    this.closed.emit();
  }

  private inicializarDesde(
    solicitud: SolicitudInsumo,
    solicitudesProduccion: SolicitudProduccionOpcion[],
  ): void {
    this.siguienteFilaId = 1;
    this.codigo.set(solicitud.codigo);
    this.fechaSolicitudMostrada.set(this.formatearFecha(solicitud.fechaCreacion));
    const opcion =
      solicitud.solicitudProduccionId !== null
        ? solicitudesProduccion.find((s) => s.id === solicitud.solicitudProduccionId)
        : undefined;
    this.solicitudProduccionCodigo.set(opcion ? opcion.codigo : '—');
    this.fechaLimiteOriginal = solicitud.fechaLimite?.slice(0, 10) ?? '';
    this.fechaLimite.set(this.fechaLimiteOriginal);
    this.detalleIdsOriginales = solicitud.detalle.map((d) => d.id);
    this.filas.set(
      solicitud.detalle.map((d) => ({
        id: this.siguienteFilaId++,
        detalleId: d.id,
        insumoId: String(d.insumoId),
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
