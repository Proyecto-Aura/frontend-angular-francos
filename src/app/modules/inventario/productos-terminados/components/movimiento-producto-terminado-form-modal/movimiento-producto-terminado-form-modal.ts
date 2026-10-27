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
import { LucideArrowLeftRight, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Combobox } from '../../../../../shared/ds/combobox/combobox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { LoteProductoTerminado } from '../../interfaces/lote-producto-terminado.interface';
import {
  FilaMovimientoProductoTerminadoForm,
  MovimientoProductoTerminado,
  MovimientoProductoTerminadoForm,
  TipoMovimientoProductoTerminado,
  filaMovimientoProductoTerminadoVacia,
} from '../../interfaces/movimiento-producto-terminado.interface';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import { LoteProductoTerminadoService } from '../../services/lote-producto-terminado.service';
import { MovimientoProductoTerminadoService } from '../../services/movimiento-producto-terminado.service';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
import {
  MovimientoProductoTerminadoFormErrores,
  validarMovimientoProductoTerminadoForm,
} from './movimiento-producto-terminado.validaciones';

const TIPOS_MOVIMIENTO: SelectOption[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
];

// Mismo patron que MovimientoFormModal (insumos) — ver ese archivo para el
// detalle de cada decision. Diferencias puntuales de producto terminado:
// - El catalogo de la fila es ProductoPresentacion (no Insumo), y el valor
//   que viaja en cada fila/al backend es "productoTerminadoId" (el id del
//   recurso producto_terminado, DISTINTO de ProductoPresentacion.id — ver el
//   comentario en ese interface). Se filtran del combobox los productos sin
//   ese id (caso rarisimo).
// - Producto terminado se cuenta en unidades simples, sin unidad de medida
//   propia (a diferencia de insumos, que muestran "kg"/"litros"/"unidad" en
//   cada cifra) — todas las cantidades se muestran como numero plano.
export interface LineaFefoProductoTerminado {
  texto: string;
  resultado: string;
}

export interface DesgloseFefoProductoTerminado {
  lineas: LineaFefoProductoTerminado[];
  cargando: boolean;
  insuficiente: boolean;
}

@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal, Select],
  selector: 'app-movimiento-producto-terminado-form-modal',
  templateUrl: './movimiento-producto-terminado-form-modal.html',
})
export class MovimientoProductoTerminadoFormModal {
  private productoService = inject(ProductoPresentacionService);
  private loteService = inject(LoteProductoTerminadoService);
  private movimientoService = inject(MovimientoProductoTerminadoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;

  open = input(false);
  // Al abrir desde el icono "Registrar movimiento" de una fila (Stock de
  // productos), precarga ese producto en la primera fila del formulario —
  // la persona igual puede cambiarlo o agregar mas filas de otros productos.
  productoPreseleccionado = input<ProductoPresentacion | null>(null);
  closed = output<void>();
  saved = output<MovimientoProductoTerminado[]>();

  readonly LucideArrowLeftRight = LucideArrowLeftRight;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly tiposMovimiento = TIPOS_MOVIMIENTO;

  tipoMovimiento = signal<TipoMovimientoProductoTerminado>('entrada');
  motivoGeneral = signal('');
  filas = signal<FilaMovimientoProductoTerminadoForm[]>([]);

  // Catalogo de productos con stock (ProductoPresentacion) — se filtran los
  // que no tienen productoTerminadoId resuelto (caso rarisimo, ver el
  // comentario en ProductoTerminadoDto), porque sin ese id no se puede
  // registrar un movimiento para ellos.
  productos = signal<ProductoPresentacion[]>([]);
  productosOptions = computed<SelectOption[]>(() =>
    this.productos().map((producto) => ({
      value: String(producto.productoTerminadoId),
      label: producto.productoNombre,
      secondary: producto.sku,
    })),
  );

  // Lotes activos por producto, cacheados por productoTerminadoId (string)
  // para no repetir el fetch si dos filas eligen el mismo producto — mismo
  // criterio que MovimientoFormModal.
  private lotesPorProducto = signal<Record<string, LoteProductoTerminado[]>>({});
  private cargandoLotesDe = signal<Set<string>>(new Set());

  cantidadProductosEnMovimiento = computed(
    () => this.filas().filter((fila) => fila.productoTerminadoId).length,
  );

  errores = signal<MovimientoProductoTerminadoFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
        this.cargarProductos();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionarTipoMovimiento(valor: string): void {
    this.tipoMovimiento.set(valor as TipoMovimientoProductoTerminado);
  }

  agregarFila(): void {
    this.filas.update((filas) => [
      ...filas,
      filaMovimientoProductoTerminadoVacia(this.siguienteFilaId++),
    ]);
  }

  quitarFila(id: number): void {
    this.filas.update((filas) => filas.filter((fila) => fila.id !== id));
  }

  seleccionarProductoDeFila(id: number, valor: string): void {
    // Cambiar de producto invalida el lote que tuviera elegido esa fila
    // (era de otro producto).
    this.filas.update((filas) =>
      filas.map((fila) =>
        fila.id === id ? { ...fila, productoTerminadoId: valor, loteId: '' } : fila,
      ),
    );
    if (valor) this.cargarLotesDeProducto(valor);
  }

  seleccionarLoteDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, loteId: valor } : fila)),
    );
  }

  actualizarCantidadDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, cantidad: valor } : fila)),
    );
  }

  productoDeFila(fila: FilaMovimientoProductoTerminadoForm): ProductoPresentacion | null {
    return (
      this.productos().find(
        (producto) => String(producto.productoTerminadoId) === fila.productoTerminadoId,
      ) ?? null
    );
  }

  stockActualDeFila(fila: FilaMovimientoProductoTerminadoForm): string {
    const producto = this.productoDeFila(fila);
    return producto ? String(producto.stockActual) : '—';
  }

  // En 'entrada' lo que importa vigilar es no pasarse del maximo
  // (sobre-stock); en 'salida'/'ajuste', no bajar del minimo (quiebre) — por
  // eso el limite que se muestra cambia segun tipoMovimiento.
  stockLimiteDeFila(fila: FilaMovimientoProductoTerminadoForm): string {
    const producto = this.productoDeFila(fila);
    if (!producto) return '—';
    const limite =
      this.tipoMovimiento() === 'entrada' ? producto.stockMaximo : producto.stockMinimo;
    return limite === null ? '—' : String(limite);
  }

  cargandoLotesDeFila(fila: FilaMovimientoProductoTerminadoForm): boolean {
    return this.cargandoLotesDe().has(fila.productoTerminadoId);
  }

  lotesDeFila(fila: FilaMovimientoProductoTerminadoForm): LoteProductoTerminado[] {
    return this.lotesPorProducto()[fila.productoTerminadoId] ?? [];
  }

  // Lotes que de verdad se pueden mover: excluye los vencidos y los
  // agotados (sin stock) en 'entrada'/'salida'. En 'ajuste' NO se excluyen
  // — mismo criterio que MovimientoFormModal (insumos).
  lotesSeleccionablesDeFila(fila: FilaMovimientoProductoTerminadoForm): LoteProductoTerminado[] {
    const lotes = this.lotesDeFila(fila);
    if (this.tipoMovimiento() === 'ajuste') return lotes;
    return lotes.filter((lote) => lote.estado !== 'vencido' && lote.cantidadActual > 0);
  }

  loteOptionsDeFila(fila: FilaMovimientoProductoTerminadoForm): SelectOption[] {
    return this.lotesSeleccionablesDeFila(fila).map((lote) => ({
      value: String(lote.id),
      label: lote.codigoLote,
      secondary: `${lote.cantidadActual} disp.`,
    }));
  }

  // Igual que MovimientoFormModal.stockLoteDeFila, sin sufijo de unidad
  // (producto terminado se cuenta en unidades simples).
  stockLoteDeFila(fila: FilaMovimientoProductoTerminadoForm): string {
    if (!fila.loteId) return '—';
    const producto = this.productoDeFila(fila);
    const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
    if (!producto || !lote) return '—';

    if (this.tipoMovimiento() === 'ajuste') {
      const cantidadReal = Number(fila.cantidad);
      if (fila.cantidad === '' || Number.isNaN(cantidadReal)) {
        return String(lote.cantidadActual);
      }
      return String(cantidadReal);
    }

    const cantidad = Number(fila.cantidad);
    const resultante =
      lote.cantidadActual + (!fila.cantidad || Number.isNaN(cantidad) ? 0 : cantidad);
    return String(resultante);
  }

  cantidadActualLoteDeFila(fila: FilaMovimientoProductoTerminadoForm): string {
    const producto = this.productoDeFila(fila);
    const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
    if (!producto || !lote) return '—';
    return String(lote.cantidadActual);
  }

  // Simula en el front el reparto FEFO que hace el backend en 'salida' —
  // misma logica que MovimientoFormModal.desgloseFefoDeFila.
  desgloseFefoDeFila(fila: FilaMovimientoProductoTerminadoForm): DesgloseFefoProductoTerminado {
    const cargando = this.cargandoLotesDeFila(fila);
    const cantidad = Number(fila.cantidad);
    if (!fila.productoTerminadoId || !fila.cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      return { lineas: [], cargando, insuficiente: false };
    }
    if (cargando) {
      return { lineas: [], cargando, insuficiente: false };
    }

    let restante = cantidad;
    const lineas: LineaFefoProductoTerminado[] = [];
    for (const lote of this.lotesSeleccionablesDeFila(fila)) {
      if (restante <= 0) break;
      const tomar = Math.min(restante, lote.cantidadActual);
      if (tomar <= 0) continue;
      const quedan = lote.cantidadActual - tomar;
      lineas.push({ texto: `${lote.codigoLote}: −${tomar}`, resultado: String(quedan) });
      restante -= tomar;
    }

    return { lineas, cargando, insuficiente: restante > 0 };
  }

  // Mismo criterio de arrastre top-to-bottom que MovimientoFormModal.
  stockResultanteDeFila(fila: FilaMovimientoProductoTerminadoForm): string {
    const producto = this.productoDeFila(fila);
    if (!producto) return '—';

    const filas = this.filas();
    const indiceFila = filas.findIndex((f) => f.id === fila.id);
    const filasDelProductoHastaAqui = filas
      .slice(0, indiceFila + 1)
      .filter((f) => f.productoTerminadoId === fila.productoTerminadoId);

    const contribuciones = filasDelProductoHastaAqui
      .map((f) => this.contribucionDeFila(f))
      .filter((contribucion): contribucion is number => contribucion !== null);
    if (contribuciones.length === 0) return '—';

    const total = contribuciones.reduce((suma, contribucion) => suma + contribucion, 0);
    return String(producto.stockActual + total);
  }

  private contribucionDeFila(fila: FilaMovimientoProductoTerminadoForm): number | null {
    if (!fila.cantidad) return null;
    const cantidad = Number(fila.cantidad);
    if (Number.isNaN(cantidad)) return null;

    const tipo = this.tipoMovimiento();
    if (tipo === 'entrada') return cantidad;
    if (tipo === 'salida') return -cantidad;

    const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
    return lote ? cantidad - lote.cantidadActual : null;
  }

  errorDeFila(id: number, campo: 'productoTerminadoId' | 'loteId' | 'cantidad'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarMovimientoProductoTerminadoForm(form);

    if (form.tipoMovimiento === 'ajuste') {
      for (const fila of form.filas) {
        const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
        if (lote && fila.cantidad !== '' && Number(fila.cantidad) === lote.cantidadActual) {
          errores.porFila = {
            ...errores.porFila,
            [fila.id]: { ...errores.porFila?.[fila.id], cantidad: 'La cantidad no cambió.' },
          };
        }
      }
    }

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

    this.guardando.set(true);
    const razon = form.motivoGeneral;
    const peticion =
      form.tipoMovimiento === 'entrada'
        ? this.movimientoService.registrarEntrada(
            form.filas.map((fila) => ({
              lote_producto_terminado_id: Number(fila.loteId),
              cantidad: Number(fila.cantidad),
              razon,
            })),
          )
        : form.tipoMovimiento === 'ajuste'
          ? this.movimientoService.registrarAjuste(
              form.filas.map((fila) => {
                const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
                const cantidadReal = Number(fila.cantidad);
                return {
                  lote_producto_terminado_id: Number(fila.loteId),
                  cantidad: lote ? cantidadReal - lote.cantidadActual : cantidadReal,
                  razon,
                };
              }),
            )
          : this.movimientoService.registrarSalida(
              form.filas.map((fila) => ({
                producto_terminado_id: Number(fila.productoTerminadoId),
                cantidad: Number(fila.cantidad),
                razon,
              })),
            );

    peticion
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (movimientos) => {
          this.saved.emit(movimientos);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private cargarProductos(): void {
    // Limite alto para traer el catalogo completo de productos activos en
    // una sola pagina — mismo criterio que insumos. Se filtran los que no
    // tienen productoTerminadoId resuelto (caso rarisimo).
    this.productoService
      .listar(1, 100, { estado: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) =>
          this.productos.set(pagina.productos.filter((p) => p.productoTerminadoId !== null)),
        error: () => this.productos.set([]),
      });
  }

  private cargarLotesDeProducto(productoTerminadoId: string): void {
    if (
      this.lotesPorProducto()[productoTerminadoId] ||
      this.cargandoLotesDe().has(productoTerminadoId)
    ) {
      return;
    }

    this.cargandoLotesDe.update((set) => new Set(set).add(productoTerminadoId));
    // Sin "estado" en el filtro a proposito: ese param es "estricto" (solo
    // "lejos de vencer"), pensado para pantallas de filtro tipo "mostrame
    // solo los X" — excluiria los "por_vencer", que igual son stock
    // utilizable para un movimiento (confirmado por el backend, mismo bug
    // reportado del lado de insumos). Se filtran vencido/agotado del lado
    // del front en lotesSeleccionablesDeFila().
    this.loteService
      .listar(1, 100, { productoTerminadoId: Number(productoTerminadoId), activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.lotesPorProducto.update((cache) => ({
            ...cache,
            [productoTerminadoId]: pagina.lotes,
          }));
          this.cargandoLotesDe.update((set) => {
            const copia = new Set(set);
            copia.delete(productoTerminadoId);
            return copia;
          });
        },
        error: () => {
          this.lotesPorProducto.update((cache) => ({ ...cache, [productoTerminadoId]: [] }));
          this.cargandoLotesDe.update((set) => {
            const copia = new Set(set);
            copia.delete(productoTerminadoId);
            return copia;
          });
        },
      });
  }

  private inicializarFormulario(): void {
    this.siguienteFilaId = 1;
    this.tipoMovimiento.set('entrada');
    this.motivoGeneral.set('');
    const preseleccionado = this.productoPreseleccionado();
    const filaInicial = filaMovimientoProductoTerminadoVacia(this.siguienteFilaId++);
    const productoTerminadoId =
      preseleccionado?.productoTerminadoId != null
        ? String(preseleccionado.productoTerminadoId)
        : '';
    this.filas.set([productoTerminadoId ? { ...filaInicial, productoTerminadoId } : filaInicial]);
    this.lotesPorProducto.set({});
    this.cargandoLotesDe.set(new Set());
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);

    if (productoTerminadoId) this.cargarLotesDeProducto(productoTerminadoId);
  }

  private formActual(): MovimientoProductoTerminadoForm {
    return {
      tipoMovimiento: this.tipoMovimiento(),
      motivoGeneral: this.motivoGeneral().trim(),
      filas: this.filas(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo registrar el movimiento. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para registrar movimientos.');
      return;
    }

    const apiError = error.error as { message?: string | string[] } | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');

    if (error.status === 400 || error.status === 404 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo registrar el movimiento. Intente nuevamente.');
      return;
    }

    this.errorGeneral.set('No se pudo registrar el movimiento. Intente nuevamente.');
  }
}
