import {
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideEye, LucidePackageCheck } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  EstadoPedidoPreparar,
  PedidoPrepararDetalle,
} from '../../interfaces/pedido-preparar.interface';
import {
  etiquetaDisponibilidadPedidoPreparar,
  etiquetaEstadoPedidoPreparar,
  tonoDisponibilidadPedidoPreparar,
  tonoEstadoPedidoPreparar,
} from '../../mappers/pedido-preparar.mapper';
import { PedidoPrepararService } from '../../services/pedido-preparar.service';

interface Campo {
  label: string;
  value: string;
}

interface FilaItem {
  id: number;
  productoPresentacionId: number;
  producto: string;
  sku: string;
  presentacion: string;
  solicitado: number;
  solicitadoMostrado: string;
  stockDisponible: number;
  stockDisponibleMostrado: string;
  cantidadPreparada: number;
}

// Modal de pedido por preparar (OFT0-260, dividido en dos modos en
// OFT0-262 a pedido explicito del usuario): "Ver detalle" ya NO cambia de
// comportamiento segun el estado del pedido — siempre muestra la tabla de
// solo lectura (columna "Stock disponible" con badge por fila) y no ofrece
// ninguna accion, solo "Cerrar". Las transiciones de estado ahora viven
// exclusivamente en los iconos de la fila de la pagina: "Iniciar
// preparación" hace el PATCH directo sin abrir este modal, y "Marcar
// pendiente de entrega" abre este MISMO componente pero con modo="preparar"
// (unico caso en el que se usa, siempre con estado "en_preparacion" porque
// asi lo garantiza la fila que lo abre).
//
// En modo="preparar" la tabla de items se vuelve editable: cada linea tiene
// un campo "cantidad preparada" (por defecto la cantidad solicitada, el
// operario la ajusta si preparo de mas/menos). Al confirmar esas cantidades
// se mandan todas juntas — el backend genera un movimiento de salida de
// inventario por producto terminado a partir de ahi (confirmado por el
// backend, incluye reparto FEFO entre lotes), asi que el front no arma el
// movimiento, solo manda la cantidad preparada por item.
//
// El PATCH de transicion devuelve el pedido completo actualizado con el
// mismo shape que obtener() (confirmado por el backend) — se usa esa
// respuesta directamente en vez de volver a pedir el detalle.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Input, Modal],
  selector: 'app-pedido-preparar-detalle-modal',
  templateUrl: './pedido-preparar-detalle-modal.html',
})
export class PedidoPrepararDetalleModal {
  private pedidoService = inject(PedidoPrepararService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaItem; index: number }>;

  @ViewChild('cantidadPreparadaCell', { static: true })
  cantidadPreparadaCellTpl!: TemplateRef<{ $implicit: FilaItem; index: number }>;

  @ViewChild('disponibilidadCell', { static: true })
  disponibilidadCellTpl!: TemplateRef<{ $implicit: FilaItem; index: number }>;

  /** null = cerrado. */
  pedidoId = input<number | null>(null);
  // 'ver' (default) = solo lectura, nunca muestra acciones. 'preparar' =
  // tabla editable + boton "Marcar pendiente de entrega" (solo lo usa el
  // icono de la fila cuando el pedido ya esta "en_preparacion").
  modo = input<'ver' | 'preparar'>('ver');
  closed = output<void>();
  // Se emite cuando una transicion de estado se aplica (o rebota en 409 y
  // hay que refrescar igual) — el listado vuelve a pedir pagina + indicadores.
  actualizado = output<void>();

  readonly LucideEye = LucideEye;

  headerIcon = computed(() => (this.modo() === 'preparar' ? LucidePackageCheck : LucideEye));

  pedido = signal<PedidoPrepararDetalle | null>(null);
  cargando = signal(false);
  error = signal(false);
  avanzando = signal(false);
  errorAvance = signal('');

  // Cantidad preparada editable por item, keyed por item.id — se
  // resincroniza con "cantidad solicitada" cada vez que se carga un pedido
  // nuevo (ver sincronizarCantidadesPreparadas).
  private cantidadesPreparadas = signal<Map<number, number>>(new Map());

  pedidoEntregado = computed(() => this.pedido()?.estado === 'pendiente_entrega');

  columnas = computed<DsColumn[]>(() => {
    const columnas: DsColumn[] = [
      { key: 'producto', header: 'Producto', cellTemplate: this.productoCellTpl },
      { key: 'presentacion', header: 'Presentación', muted: true },
      { key: 'solicitadoMostrado', header: 'Solicitado', numeric: true, strong: true },
    ];
    if (this.modo() === 'preparar') {
      // En modo "preparar" tambien se ve el stock disponible (sin badge,
      // solo el numero) junto a la cantidad editable — el operario lo
      // necesita para decidir hasta cuanto ajustar "Cantidad preparada"
      // cuando falta stock.
      columnas.push(
        { key: 'stockDisponibleMostrado', header: 'Stock disponible', muted: true },
        {
          key: 'cantidadPreparada',
          header: 'Cantidad preparada',
          numeric: true,
          cellTemplate: this.cantidadPreparadaCellTpl,
        },
      );
    } else if (!this.pedidoEntregado()) {
      columnas.push({
        key: 'stockDisponible',
        header: 'Stock disponible',
        cellTemplate: this.disponibilidadCellTpl,
      });
    }
    // Una vez "pendiente_entrega" ya se aplico el descuento de stock: la
    // tabla se queda solo con Producto/Presentacion/Solicitado, sin ninguna
    // columna de stock. Se intento agregar "Stock actual"/"Stock anterior"
    // (ver git blame), pero el backend lo revirtio — el calculo usaba stock
    // EN VIVO, asi que "stock anterior" no quedaba congelado y el numero se
    // movia solo cada vez que se preparaba otro pedido del mismo producto.
    return columnas;
  });

  constructor() {
    effect(() => {
      const id = this.pedidoId();
      if (id !== null) {
        this.cargar(id);
      }
    });
  }

  cargar(id: number, conservarErrorAvance = false): void {
    this.cargaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set(false);
    if (!conservarErrorAvance) this.errorAvance.set('');

    this.cargaSub = this.pedidoService
      .obtener(id)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pedido) => {
          this.pedido.set(pedido);
          this.sincronizarCantidadesPreparadas(pedido);
        },
        error: () => {
          this.pedido.set(null);
          this.error.set(true);
        },
      });
  }

  private sincronizarCantidadesPreparadas(pedido: PedidoPrepararDetalle): void {
    this.cantidadesPreparadas.set(new Map(pedido.items.map((i) => [i.id, i.cantidad])));
  }

  reintentar(): void {
    const id = this.pedidoId();
    if (id !== null) this.cargar(id);
  }

  titulo = computed(() => {
    const p = this.pedido();
    return p ? `Pedido ${p.codigo}` : 'Pedido';
  });

  // "Disponibilidad" vive aparte de campos() (no es texto plano, es un
  // badge de 3 tonos — completo/parcial/sin_stock, igual patron que el
  // estado de "Stock de productos").
  campos = computed<Campo[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    return [
      { label: 'Cliente', value: p.clienteNombre },
      { label: 'Fecha del pedido', value: this.formatearFechaHora(p.fechaCreacion) },
      { label: 'Productos', value: `${p.cantidadProductos} productos` },
      { label: 'Unidades', value: `${p.cantidadUnidades}` },
    ];
  });

  disponibilidadLabel = computed(() => {
    const p = this.pedido();
    return p ? etiquetaDisponibilidadPedidoPreparar(p.disponibilidad) : '';
  });

  disponibilidadTono = computed<BadgeTone>(() => {
    const p = this.pedido();
    return p ? tonoDisponibilidadPedidoPreparar(p.disponibilidad) : 'neutral';
  });

  // Mismo criterio que el boton "Iniciar preparación" de la fila: bloqueado
  // salvo disponibilidad === 'completo' — pedido explicito del usuario, para
  // que el flujo sea consistente en los dos pasos (iniciar y entregar), aun
  // si eso significa que a veces haya que esperar a que se libere stock en
  // vez de ajustar la cantidad preparada a lo que si hay.
  entregaBloqueada = computed(() => this.pedido()?.disponibilidad !== 'completo');

  filas = computed<FilaItem[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    const cantidades = this.cantidadesPreparadas();
    return p.items.map((i) => ({
      id: i.id,
      productoPresentacionId: i.productoPresentacionId,
      producto: i.producto,
      sku: i.sku,
      presentacion: i.presentacion,
      solicitado: i.cantidad,
      solicitadoMostrado: `${i.cantidad} unid.`,
      stockDisponible: i.stockDisponible,
      stockDisponibleMostrado: `${i.stockDisponible} unid.`,
      cantidadPreparada: cantidades.get(i.id) ?? i.cantidad,
    }));
  });

  textoAyuda = computed(() => {
    if (this.modo() !== 'preparar') return null;
    if (this.entregaBloqueada()) {
      return 'No se puede confirmar la entrega: falta stock para completar el pedido.';
    }
    return 'Ajusta la cantidad preparada si es distinta a la solicitada. Al confirmar se registrará la salida de inventario.';
  });

  actualizarCantidadPreparada(itemId: number, valor: string): void {
    const cantidad = Math.max(0, Number(valor) || 0);
    this.cantidadesPreparadas.update((actual) => {
      const copia = new Map(actual);
      copia.set(itemId, cantidad);
      return copia;
    });
  }

  estadoLabel(estado: EstadoPedidoPreparar): string {
    return etiquetaEstadoPedidoPreparar(estado);
  }

  estadoTone(estado: EstadoPedidoPreparar): BadgeTone {
    return tonoEstadoPedidoPreparar(estado);
  }

  // Badge por fila en la columna "Stock disponible" (reemplaza el bloque de
  // texto con la lista de faltantes que habia antes — pedido explicito del
  // usuario). Es binario a proposito — a diferencia de la disponibilidad
  // del pedido completo (completo/parcial/sin_stock), una sola fila/producto
  // siempre alcanza o no alcanza, no existe un "parcial" por item.
  //
  // El numero y el badge van apilados (numero arriba, badge abajo sin
  // repetirlo) en vez de "Stock completo (10)" en una sola linea — mismo
  // ajuste que se le pidio a la columna "Producto" (nombre + sku), para que
  // no se vea apretado.
  private filaSinStockSuficiente(fila: FilaItem): boolean {
    return fila.stockDisponible < fila.solicitado;
  }

  disponibilidadFilaEstado(fila: FilaItem): string {
    return this.filaSinStockSuficiente(fila) ? 'Stock insuficiente' : 'Stock completo';
  }

  disponibilidadFilaTono(fila: FilaItem): BadgeTone {
    return this.filaSinStockSuficiente(fila) ? 'danger' : 'success';
  }

  // Unico modo que hace PATCH desde este modal: "preparar" siempre
  // representa el pedido en "en_preparacion" (lo garantiza la fila que
  // abre este modo), asi que esto siempre es el PATCH .../pendiente-entrega
  // con las cantidades preparadas — "Iniciar preparación" (en_espera -> en
  // preparacion) ahora es un PATCH directo desde la fila, sin este modal.
  avanzarEstado(): void {
    const p = this.pedido();
    if (
      !p ||
      this.modo() !== 'preparar' ||
      this.avanzando() ||
      this.cargando() ||
      this.error() ||
      this.entregaBloqueada()
    ) {
      return;
    }

    this.avanzando.set(true);
    this.errorAvance.set('');

    const cantidades = this.cantidadesPreparadas();
    const items = p.items.map((i) => ({
      productoPresentacionId: i.productoPresentacionId,
      cantidadPreparada: cantidades.get(i.id) ?? i.cantidad,
    }));

    this.pedidoService
      .marcarPendienteEntrega(p.id, items)
      .pipe(
        finalize(() => this.avanzando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        // Exito = ya no hay nada mas que ajustar aca, se cierra solo (el
        // listado se refresca via actualizado) — dejarlo abierto mostraba
        // la misma tabla editable y el mismo boton sobre un pedido que ya
        // cambio de estado, un segundo click hubiera fallado.
        next: () => {
          this.actualizado.emit();
          this.cerrar();
        },
        // 409 aca significa stock insuficiente en alguna linea (no se crea
        // nada) — no recargamos, para no perder las cantidades que el
        // operario esta ajustando.
        error: (error) => {
          this.errorAvance.set(
            error.status === 409
              ? 'No hay stock suficiente para alguna línea. Ajusta las cantidades e intenta de nuevo.'
              : error.status === 400
                ? 'Las cantidades enviadas no coinciden con los productos del pedido.'
                : 'No se pudo registrar la preparación. Intenta nuevamente.',
          );
        },
      });
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.pedido.set(null);
    this.cantidadesPreparadas.set(new Map());
    this.error.set(false);
    this.errorAvance.set('');
    this.closed.emit();
  }

  // Parseo manual para fechas "puras" YYYY-MM-DD (sin desfase de zona
  // horaria) y para timestamps completos — mismo criterio que
  // solicitud-detalle-modal.ts.
  private formatearFechaHora(fechaIso: string): string {
    const esSoloFecha = fechaIso.length <= 10;
    let fecha: Date;
    if (esSoloFecha) {
      const [anio, mes, dia] = fechaIso.split('-').map(Number);
      fecha = new Date(anio, mes - 1, dia);
    } else {
      fecha = new Date(fechaIso);
    }

    const fechaMostrada = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
    const horaMostrada = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
    return `${fechaMostrada} · ${horaMostrada}`;
  }
}
