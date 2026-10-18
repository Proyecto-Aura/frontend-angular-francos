import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCircleAlert, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';

import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { MetodoPagoDto, TipoEntregaDto } from '../../interfaces/pedido-dto.interface';
import {
  ClienteOpcion,
  ItemForm,
  METODOS_PAGO,
  PedidoFormModel,
  PresentacionOpcion,
  ResultadoGuardado,
  TIPOS_ENTREGA,
  itemVacio,
  metodoPagoLabel,
  money,
  pedidoFormVacio,
  precioEstimado,
  subtotalEstimado,
  totalEstimado,
  validarPedido,
} from '../../interfaces/pedido.interface';
import { CulqiCheckoutService } from '../../services/culqi-checkout.service';
import { PedidosService } from '../../services/pedidos.service';
import { mensajeDeErrorPedido } from '../../utils/error-api';

/** RF-A032: registro manual de un pedido por el operador de ventas. */
@Component({
  imports: [Button, Field, Icon, IconButton, Input, Modal, Select],
  selector: 'app-pedido-form',
  templateUrl: './pedido-form.html',
})
export class PedidoForm {
  private pedidosService = inject(PedidosService);
  private culqiCheckout = inject(CulqiCheckoutService);
  private destroyRef = inject(DestroyRef);

  abierto = input(false);
  closed = output<void>();
  /** Emite el aviso a mostrar en el listado tras registrar. */
  registrado = output<ResultadoGuardado>();

  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideCircleAlert = LucideCircleAlert;

  protected readonly money = money;
  protected readonly culqiDisponible = this.culqiCheckout.disponible;

  protected pf = signal<PedidoFormModel>(pedidoFormVacio());
  protected clientes = signal<ClienteOpcion[]>([]);
  protected presentaciones = signal<PresentacionOpcion[]>([]);
  protected cargandoOpciones = signal(false);
  protected errorOpciones = signal(false);
  protected errores = signal<string[]>([]);
  /** Mensaje de la API o de Culqi cuando no se pudo registrar (el formulario sigue abierto). */
  protected errorApi = signal('');
  protected guardando = signal(false);

  private culqiSub: Subscription | null = null;

  constructor() {
    // Cada vez que se abre, el formulario empieza vacío y recarga las opciones.
    effect(() => {
      const abierto = this.abierto();
      untracked(() => {
        if (!abierto) return;
        this.pf.set(pedidoFormVacio());
        this.errores.set([]);
        this.errorApi.set('');
        this.guardando.set(false);
        this.cargarOpciones();
      });
    });
  }

  protected cargarOpciones() {
    this.cargandoOpciones.set(true);
    this.errorOpciones.set(false);
    this.pedidosService
      .opcionesRegistro()
      .pipe(
        finalize(() => this.cargandoOpciones.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ clientes, presentaciones }) => {
          this.clientes.set(clientes);
          this.presentaciones.set(presentaciones);
        },
        error: () => this.errorOpciones.set(true),
      });
  }

  // ───────────── Opciones de los selects ─────────────

  protected clienteOptions = computed<SelectOption[]>(() =>
    this.clientes().map((c) => ({ value: c.id, label: `${c.nombre} · ${c.documento}` })),
  );

  /** Cada fila ofrece las presentaciones que no se eligieron en otra fila. */
  protected presentacionOptions(idx: number): SelectOption[] {
    const elegidasEnOtras = new Set(
      this.pf()
        .items.filter((_, i) => i !== idx)
        .map((i) => i.presentacionId),
    );
    return this.presentaciones()
      .filter((p) => !elegidasEnOtras.has(String(p.id)))
      .map((p) => ({ value: String(p.id), label: `${p.nombre} · ${money(p.precioUnit)}` }));
  }

  protected readonly tipoEntregaOptions: SelectOption[] = TIPOS_ENTREGA.map((t) => ({
    value: t.value,
    label: t.label,
  }));

  protected readonly metodoPagoOptions: SelectOption[] = METODOS_PAGO.filter(
    (m) => m.value !== 'culqi' || this.culqiCheckout.disponible,
  ).map((m) => ({ value: m.value, label: m.label }));

  // ───────────── Resumen ─────────────

  protected total = computed(() => totalEstimado(this.pf(), this.presentaciones()));

  protected lineaDe(item: ItemForm): {
    precio: number;
    subtotal: number;
    mayorista: boolean;
  } | null {
    const p = this.presentaciones().find((o) => String(o.id) === item.presentacionId);
    const cantidad = Number(item.cantidad);
    if (!p || !Number.isInteger(cantidad) || cantidad < 1) return null;
    const precio = precioEstimado(p, cantidad);
    return { precio, subtotal: subtotalEstimado(p, cantidad), mayorista: precio !== p.precioUnit };
  }

  protected textoBoton = computed(() =>
    this.pf().metodoPago === 'culqi' ? 'Pagar con Culqi y registrar' : 'Registrar pedido',
  );

  // ───────────── Cambios de campos (inmutables, patrón signals) ─────────────

  protected setCliente(id: string) {
    const cliente = this.clientes().find((c) => c.id === id);
    // Se propone la dirección del cliente si todavía no se escribió otra.
    this.pf.update((f) => ({
      ...f,
      clienteId: id,
      direccion: f.direccion.trim() ? f.direccion : (cliente?.direccion ?? ''),
    }));
  }

  protected setTipoEntrega(valor: string) {
    this.pf.update((f) => ({ ...f, tipoEntrega: valor as TipoEntregaDto }));
  }

  protected setDireccion(valor: string) {
    this.pf.update((f) => ({ ...f, direccion: valor }));
  }

  protected setMetodoPago(valor: string) {
    this.pf.update((f) => ({ ...f, metodoPago: valor as MetodoPagoDto }));
  }

  protected setItem<K extends keyof ItemForm>(idx: number, campo: K, valor: ItemForm[K]) {
    this.pf.update((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)),
    }));
  }

  protected agregarItem() {
    this.pf.update((f) => ({ ...f, items: [...f.items, itemVacio()] }));
  }

  protected quitarItem(idx: number) {
    this.pf.update((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  // ───────────── Guardar ─────────────

  protected guardar() {
    if (this.guardando()) return;

    const form = this.pf();
    const errores = validarPedido(form);
    this.errorApi.set('');
    this.errores.set(errores);
    if (errores.length) return;

    if (form.metodoPago === 'culqi') {
      // Primero el cliente paga en el checkout; con el token, la API cobra y registra.
      this.culqiSub?.unsubscribe();
      this.culqiSub = this.culqiCheckout
        .pedirToken(this.total())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (token) => this.enviar(form, token),
          error: (error: unknown) =>
            this.errorApi.set(
              error instanceof Error ? error.message : 'Culqi no pudo procesar el pago.',
            ),
        });
      return;
    }

    this.enviar(form, null);
  }

  private enviar(form: PedidoFormModel, culqiToken: string | null) {
    this.guardando.set(true);
    this.pedidosService
      .registrar(form, culqiToken)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pedido) => {
          this.registrado.emit({
            tono: 'ok',
            mensaje: `Pedido ${pedido.codigo} registrado · total ${money(pedido.total)} · pago ${metodoPagoLabel(form.metodoPago).toLowerCase()} confirmado.`,
          });
          this.closed.emit();
        },
        error: (error: unknown) =>
          this.errorApi.set(
            mensajeDeErrorPedido(error, 'No se pudo registrar el pedido. Intente nuevamente.'),
          ),
      });
  }

  protected cerrar() {
    this.culqiSub?.unsubscribe();
    this.closed.emit();
  }
}
