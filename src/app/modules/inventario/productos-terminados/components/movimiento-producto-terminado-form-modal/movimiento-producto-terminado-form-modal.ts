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
import { Subscription, finalize } from 'rxjs';
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
import { PedidoPreparar, PedidoPrepararDetalle } from '../../interfaces/pedido-preparar.interface';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import { LoteProductoTerminadoService } from '../../services/lote-producto-terminado.service';
import { MovimientoProductoTerminadoService } from '../../services/movimiento-producto-terminado.service';
import { PedidoPrepararService } from '../../services/pedido-preparar.service';
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
  private pedidoService = inject(PedidoPrepararService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;
  private cargaPedidoSub: Subscription | null = null;

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
  // Nombre + presentacion en el label (no solo el nombre): el mismo
  // producto puede tener varias presentaciones con el mismo nombre (ej.
  // "chifles dulce" en 500gr y 1kg) — sin la presentacion, el combobox las
  // mostraba identicas y era imposible saber cual era cual a simple vista.
  productosOptions = computed<SelectOption[]>(() =>
    this.productos().map((producto) => ({
      value: String(producto.productoTerminadoId),
      label: `${producto.productoNombre} · ${etiquetaPresentacion(producto.presentacionCantidad, producto.presentacionUnidadMedida)}`,
      secondary: producto.sku,
    })),
  );

  // Lotes activos por producto, cacheados por productoTerminadoId (string)
  // para no repetir el fetch si dos filas eligen el mismo producto — mismo
  // criterio que MovimientoFormModal.
  private lotesPorProducto = signal<Record<string, LoteProductoTerminado[]>>({});
  private cargandoLotesDe = signal<Set<string>>(new Set());

  // Buscador de pedidos (solo visible/usado en 'salida') — se carga una vez
  // al abrir el form, igual que productos(), y el combobox filtra en vivo.
  // Elegir un pedido es una SEGUNDA MANERA de registrar una salida (pedido
  // explicito del usuario): el modal NO cambia de forma — autocompleta
  // "Producto" y "Cantidad" de la(s) fila(s) de la MISMA tabla de siempre
  // (filas, FilaMovimientoProductoTerminadoForm), el resto de columnas
  // (Stock actual/minimo/Lotes FEFO/Stock lote/Stock producto) ya se
  // calculan solas con esos dos datos, igual que en el flujo manual. El
  // boton sigue diciendo "Registrar movimiento", pero adentro confirma la
  // entrega del pedido (mismo PATCH que "Pedidos por preparar") en vez de
  // crear un movimiento generico — backend confirmo que no hace falta
  // endpoint nuevo para esto.
  pedidoBuscado = signal('');
  pedidosEnPreparacion = signal<PedidoPreparar[]>([]);
  pedidosOptions = computed<SelectOption[]>(() =>
    this.pedidosEnPreparacion().map((pedido) => ({
      value: String(pedido.id),
      label: pedido.codigo,
      secondary: pedido.clienteNombre,
    })),
  );

  pedido = signal<PedidoPrepararDetalle | null>(null);
  cargandoPedido = signal(false);

  // Mismo criterio que "Iniciar preparación"/"Marcar pendiente de entrega"
  // en Pedidos por preparar: bloqueado salvo disponibilidad === 'completo'.
  entregaPedidoBloqueada = computed(() => {
    const p = this.pedido();
    return p !== null && p.disponibilidad !== 'completo';
  });

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
        this.cargarPedidosEnPreparacion();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  // Cambiar a un tipo distinto de 'salida' limpia cualquier pedido elegido
  // (el campo/tabla de pedido solo existe en 'salida') — evita que quede un
  // pedido "fantasma" seleccionado y que guardar() termine confirmando una
  // entrega en vez de crear el movimiento de Entrada/Ajuste que se ve en
  // pantalla (hallazgo de Codex).
  seleccionarTipoMovimiento(valor: string): void {
    this.tipoMovimiento.set(valor as TipoMovimientoProductoTerminado);
    // Solo limpiar si de verdad habia un pedido elegido (o cargando) — sin
    // este guard se borraban las filas manuales de la persona con solo
    // cambiar de tipo, aunque nunca hubiera tocado el buscador de pedidos
    // (regresion detectada por Codex).
    const habiaPedido = this.pedido() !== null || this.cargandoPedido() || !!this.pedidoBuscado();
    if (valor !== 'salida' && habiaPedido) this.limpiarPedidoSeleccionado();
  }

  // Elegir un pedido carga su detalle y autocompleta "Producto" + "Cantidad"
  // de las filas de la tabla de siempre — no cierra el form, todo pasa en
  // el mismo modal, con la misma tabla.
  seleccionarPedido(valor: string): void {
    // Cancela cualquier GET anterior todavia en vuelo: sin esto, elegir A y
    // enseguida B (o limpiar) podia dejar que la respuesta tardia de A
    // sobreescribiera el pedido/motivo ya resueltos para B (hallazgo de
    // Codex).
    this.cargaPedidoSub?.unsubscribe();
    this.pedidoBuscado.set(valor);
    this.errorGeneral.set(null);

    if (!valor) {
      this.pedido.set(null);
      this.limpiarFilasDePedido();
      this.cargandoPedido.set(false);
      return;
    }

    this.cargandoPedido.set(true);
    this.cargaPedidoSub = this.pedidoService
      .obtener(Number(valor))
      .pipe(
        finalize(() => this.cargandoPedido.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detalle) => {
          this.pedido.set(detalle);
          this.motivoGeneral.set(`Pedido ${detalle.codigo}`);
          // Cada item del pedido se resuelve a su productoTerminadoId via
          // SKU (los items de pedido traen producto_presentacion_id/sku,
          // la tabla trabaja con productoTerminadoId — ver comentario al
          // inicio del archivo). Si algun producto no esta en el catalogo
          // cargado (caso rarisimo: inactivo), esa fila queda sin producto
          // resuelto — guardarPedido() lo bloquea mas abajo.
          const nuevasFilas = detalle.items.map((item) => ({
            id: item.id,
            productoTerminadoId: this.productoTerminadoIdPorSku(item.sku),
            loteId: '',
            cantidad: String(item.cantidad),
          }));
          this.filas.set(nuevasFilas);
          // Sin esto, la columna "Lotes" (desgloseFefoDeFila) se queda
          // vacia/"insuficiente" para estos productos hasta que algo mas
          // dispare la carga — mismo flujo que seleccionarProductoDeFila.
          for (const fila of nuevasFilas) {
            if (fila.productoTerminadoId) this.cargarLotesDeProducto(fila.productoTerminadoId);
          }
        },
        error: () => {
          this.pedido.set(null);
          this.limpiarFilasDePedido();
          this.errorGeneral.set('No se pudo cargar el pedido. Intenta nuevamente.');
        },
      });
  }

  private productoTerminadoIdPorSku(sku: string): string {
    const producto = this.productos().find((p) => p.sku === sku);
    return producto ? String(producto.productoTerminadoId) : '';
  }

  private limpiarPedidoSeleccionado(): void {
    this.cargaPedidoSub?.unsubscribe();
    this.pedidoBuscado.set('');
    this.pedido.set(null);
    this.cargandoPedido.set(false);
    this.limpiarFilasDePedido();
  }

  // Vuelve la tabla a una sola fila vacia, igual que al abrir el form —
  // se usa al limpiar el pedido elegido (manualmente o al cambiar de tipo
  // de movimiento) para no dejar las filas que trajo ese pedido.
  private limpiarFilasDePedido(): void {
    this.filas.set([filaMovimientoProductoTerminadoVacia(this.siguienteFilaId++)]);
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

  mostrarUnidades(valor: string): string {
    return valor === '—' ? valor : `${valor} unid.`;
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
    if (this.pedido()) {
      this.guardarPedido();
      return;
    }

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

  // Segunda manera de registrar una salida: confirma la entrega del pedido
  // elegido (PATCH .../pendiente-entrega), igual que "Marcar pendiente de
  // entrega" en Pedidos por preparar — no pasa por movimientoService, ese
  // endpoint generico no sabe nada de pedidos.
  private guardarPedido(): void {
    const pedido = this.pedido();
    if (!pedido || this.guardando() || this.cargandoPedido() || this.entregaPedidoBloqueada()) {
      return;
    }

    // Caso rarisimo: productoTerminadoIdPorSku no encontro el producto de
    // algun item en el catalogo (ej. quedo inactivo) — sin esto se mandaria
    // un producto_presentacion_id valido con una fila vacia en pantalla,
    // sin que la persona se entere de que algo no cuadra.
    if (this.filas().some((fila) => !fila.productoTerminadoId)) {
      this.errorGeneral.set(
        'No se pudo identificar algún producto de este pedido en el catálogo. Contacta a soporte.',
      );
      return;
    }

    this.errorGeneral.set(null);
    this.guardando.set(true);

    // Las filas se crearon con id = item.id del pedido (ver seleccionarPedido)
    // — se matchean por ahi para mandar la cantidad que de verdad quedo en
    // la tabla (la persona pudo haberla editado, incluso a 0).
    const cantidadPorId = new Map(this.filas().map((fila) => [fila.id, fila.cantidad]));
    const items = pedido.items.map((i) => {
      const texto = cantidadPorId.get(i.id);
      const cantidadPreparada = texto !== undefined && texto !== '' ? Number(texto) : i.cantidad;
      return { productoPresentacionId: i.productoPresentacionId, cantidadPreparada };
    });

    this.pedidoService
      .marcarPendienteEntrega(pedido.id, items)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.emit([]);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarErrorPedido(error),
      });
  }

  private manejarErrorPedido(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo registrar la preparación. Intenta nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para confirmar la entrega de este pedido.');
      return;
    }

    // 409 aca significa stock insuficiente en alguna linea (no se crea
    // nada) — mismo criterio que pedido-preparar-detalle-modal.
    this.errorGeneral.set(
      error.status === 409
        ? 'No hay stock suficiente para alguna línea. Ajusta las cantidades e intenta de nuevo.'
        : error.status === 400
          ? 'Las cantidades enviadas no coinciden con los productos del pedido.'
          : 'No se pudo registrar la preparación. Intenta nuevamente.',
    );
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

  // Limite alto por el mismo motivo que cargarProductos() — el combobox
  // filtra en vivo sobre esta lista, no hay busqueda contra el backend.
  private cargarPedidosEnPreparacion(): void {
    this.pedidoService
      .listar(1, 100, { estado: 'en_preparacion' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.pedidosEnPreparacion.set(pagina.pedidos),
        error: () => this.pedidosEnPreparacion.set([]),
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
    // Reseteo directo del pedido (sin pasar por limpiarPedidoSeleccionado,
    // que tambien reescribe filas() — aca abajo se arma filas() una sola
    // vez, con el producto preseleccionado si corresponde).
    this.cargaPedidoSub?.unsubscribe();
    this.pedidoBuscado.set('');
    this.pedido.set(null);
    this.cargandoPedido.set(false);
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
