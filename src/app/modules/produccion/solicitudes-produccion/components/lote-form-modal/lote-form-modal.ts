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
import { Subscription, finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Combobox } from '../../../../../shared/ds/combobox/combobox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { SelectOption } from '../../../../../shared/ds/select/select';
import {
  LoteProductoTerminado,
  LoteProductoTerminadoForm,
} from '../../interfaces/lote-producto-terminado.interface';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import { SolicitudProduccion } from '../../interfaces/solicitud-produccion.interface';
import { construirCodigoLote } from '../../mappers/lote-producto-terminado.mapper';
import { LoteProductoTerminadoService } from '../../services/lote-producto-terminado.service';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
import { SolicitudProduccionService } from '../../services/solicitud-produccion.service';
import { LoteFormErrores, validarLoteForm } from './lote-form.validaciones';

// Forma comun entre un producto del catalogo y una linea de detalle de
// solicitud — ambos traen lo que necesita el formulario (sku, nombre,
// presentacion). Permite que productoSeleccionado() funcione igual sin
// importar de donde salio el producto elegido.
interface ProductoElegible {
  productoTerminadoId: number | null;
  sku: string;
  productoNombre: string;
  presentacionCantidad: number;
  presentacionUnidadMedida: 'kg' | 'gr';
}

// YYYY-MM-DD en hora local, no UTC — para que coincida con lo que vera la
// persona en pantalla.
function fechaIsoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// "Agregar lote" (OFT0-263) — POST /lotes-producto-terminado, antes solo
// lectura (los lotes nacian por seed). Mismo patron/UX que
// LoteFormModal de Insumos: codigo de lote autogenerado (no editable), no
// se puede guardar hasta que termine de generarse.
@Component({
  imports: [Button, Combobox, Field, Icon, Input, Modal],
  selector: 'app-lote-form-modal',
  templateUrl: './lote-form-modal.html',
})
export class LoteFormModal {
  private productoService = inject(ProductoPresentacionService);
  private solicitudService = inject(SolicitudProduccionService);
  private loteService = inject(LoteProductoTerminadoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private cargaSolicitudSub: Subscription | null = null;

  open = input(false);
  closed = output<void>();
  saved = output<LoteProductoTerminado>();

  readonly LucideLayers = LucideLayers;

  productoTerminadoId = signal('');
  fechaVencimiento = signal('');
  cantidadInicial = signal('');

  productos = signal<ProductoPresentacion[]>([]);

  // Buscador de "Solicitud" (OFT0-262, opcional): si se elige una, liga el
  // lote a esa solicitud y filtra "Producto" para mostrar solo las lineas
  // que todavia no tienen lote (loteCreado === false) — en vez del catalogo
  // completo. Sin solicitud elegida, el flujo "suelto" de siempre sigue
  // igual.
  solicitudesEnProceso = signal<SolicitudProduccion[]>([]);
  solicitudesOptions = computed<SelectOption[]>(() =>
    this.solicitudesEnProceso().map((s) => ({
      value: String(s.id),
      label: s.codigo,
      secondary: s.solicitadoPorNombre,
    })),
  );
  solicitudProduccionId = signal('');
  solicitudDetalle = signal<SolicitudProduccion | null>(null);
  cargandoSolicitud = signal(false);

  itemsPendientesSolicitud = computed(
    () => this.solicitudDetalle()?.detalle.filter((d) => !d.loteCreado) ?? [],
  );

  productosOptions = computed<SelectOption[]>(() => {
    if (this.solicitudDetalle()) {
      return this.itemsPendientesSolicitud().map((d) => ({
        value: String(d.productoTerminadoId),
        label: `${d.sku} · ${d.productoNombre} · ${d.presentacionCantidad} ${d.presentacionUnidadMedida}`,
        secondary: `Solicita ${d.cantidadSolicitada} unid.`,
      }));
    }
    return this.productos()
      .filter((p) => p.productoTerminadoId !== null)
      .map((p) => ({
        value: String(p.productoTerminadoId),
        label: `${p.sku} · ${p.productoNombre} · ${p.presentacionCantidad} ${p.presentacionUnidadMedida}`,
      }));
  });
  productoSeleccionado = computed<ProductoElegible | null>(() => {
    const id = this.productoTerminadoId();
    if (!id) return null;
    if (this.solicitudDetalle()) {
      return (
        this.itemsPendientesSolicitud().find((d) => String(d.productoTerminadoId) === id) ?? null
      );
    }
    return this.productos().find((p) => String(p.productoTerminadoId) === id) ?? null;
  });
  presentacionProducto = computed(() => {
    const p = this.productoSeleccionado();
    return p ? `${p.presentacionCantidad} ${p.presentacionUnidadMedida}` : '';
  });

  fechaProduccionHoy = computed(() => fechaIsoLocal(new Date()));
  fechaProduccionMostrada = computed(() =>
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
        this.cargarProductos();
        this.cargarSolicitudesEnProceso();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.cargaSolicitudSub?.unsubscribe();
    this.closed.emit();
  }

  seleccionarSolicitud(valor: string): void {
    this.cargaSolicitudSub?.unsubscribe();
    this.solicitudProduccionId.set(valor);
    this.productoTerminadoId.set('');
    this.cantidadInicial.set('');
    this.codigoLote.set('');

    if (!valor) {
      this.solicitudDetalle.set(null);
      this.cargandoSolicitud.set(false);
      return;
    }

    this.cargandoSolicitud.set(true);
    this.cargaSolicitudSub = this.solicitudService
      .obtener(Number(valor))
      .pipe(
        finalize(() => this.cargandoSolicitud.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (solicitud) => this.solicitudDetalle.set(solicitud),
        error: () => {
          this.solicitudDetalle.set(null);
          this.solicitudProduccionId.set('');
        },
      });
  }

  seleccionarProducto(valor: string): void {
    this.productoTerminadoId.set(valor);
    this.regenerarCodigo();

    // Autocompleta "Cantidad" con lo solicitado en esa linea (pedido
    // explicito del usuario) — sigue siendo editable despues, por si el
    // operario produjo de mas o de menos.
    if (this.solicitudDetalle()) {
      const item = this.itemsPendientesSolicitud().find(
        (d) => String(d.productoTerminadoId) === valor,
      );
      if (item) this.cantidadInicial.set(String(item.cantidadSolicitada));
    }
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarLoteForm(form);

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
          const solicitudId = this.solicitudDetalle()?.id;
          if (solicitudId) {
            this.refrescarSolicitudTrasGuardar(solicitudId);
            return;
          }
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  // Si quedan mas productos de la misma solicitud sin lote, se deja el
  // modal abierto con la solicitud aun elegida (y el desplegable de
  // "Producto" ya filtrado por el detalle actualizado) para que el
  // operario encadene el siguiente lote sin tener que volver a buscarla —
  // pedido explicito del usuario ("se repite el mismo flujo"). Si ya no
  // queda ninguno, se cierra igual que el flujo "suelto".
  private refrescarSolicitudTrasGuardar(solicitudId: number): void {
    this.productoTerminadoId.set('');
    this.cantidadInicial.set('');
    this.codigoLote.set('');
    this.errores.set({});

    this.solicitudService
      .obtener(solicitudId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (solicitud) => {
          this.solicitudDetalle.set(solicitud);
          const quedanPendientes = solicitud.detalle.some((d) => !d.loteCreado);
          if (!quedanPendientes) this.closed.emit();
        },
        error: () => this.closed.emit(),
      });
  }

  errorDe(campo: keyof LoteFormErrores): string | null {
    return this.errores()[campo] ?? null;
  }

  private cargarProductos(): void {
    // Limite alto para traer el catalogo completo en una sola pagina —
    // igual que el resto del formulario, pensado para el tamano de catalogo
    // actual.
    this.productoService
      .listar(1, 100, { estado: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.productos.set(pagina.productos),
        error: () => this.productos.set([]),
      });
  }

  private cargarSolicitudesEnProceso(): void {
    this.solicitudService
      .listar(1, 100, { estado: 'en_proceso' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.solicitudesEnProceso.set(pagina.solicitudes),
        error: () => this.solicitudesEnProceso.set([]),
      });
  }

  private regenerarCodigo(): void {
    const productoTerminadoId = this.productoTerminadoId();
    const producto = this.productoSeleccionado();
    if (!productoTerminadoId || !producto) {
      this.codigoLote.set('');
      return;
    }

    this.generandoCodigo.set(true);
    this.loteService
      .siguienteSecuencial(Number(productoTerminadoId))
      .pipe(
        finalize(() => this.generandoCodigo.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (secuencial) => this.codigoLote.set(construirCodigoLote(secuencial, producto.sku)),
        error: () => this.codigoLote.set(''),
      });
  }

  private inicializarFormulario(): void {
    this.cargaSolicitudSub?.unsubscribe();
    this.productoTerminadoId.set('');
    this.fechaVencimiento.set('');
    this.cantidadInicial.set('');
    this.codigoLote.set('');
    this.solicitudProduccionId.set('');
    this.solicitudDetalle.set(null);
    this.cargandoSolicitud.set(false);
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private formActual(): LoteProductoTerminadoForm {
    return {
      productoTerminadoId: this.productoTerminadoId(),
      codigoLote: this.codigoLote(),
      fechaProduccion: this.fechaProduccionHoy(),
      fechaVencimiento: this.fechaVencimiento(),
      cantidadInicial: this.cantidadInicial(),
      solicitudProduccionId: this.solicitudDetalle()?.id ? String(this.solicitudDetalle()!.id) : '',
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

    if (error.status === 400 && mensajeMin.includes('vencimiento')) {
      this.errores.update((actuales) => ({ ...actuales, fechaVencimiento: mensaje }));
      return;
    }

    if (error.status === 404) {
      this.errores.update((actuales) => ({
        ...actuales,
        productoTerminadoId: 'Ese producto ya no existe.',
      }));
      return;
    }

    // Codigo duplicado o producto inactivo (carrera entre dos registros a la
    // vez): se regenera el codigo para que la persona pueda reintentar sin
    // recargar todo el formulario.
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
