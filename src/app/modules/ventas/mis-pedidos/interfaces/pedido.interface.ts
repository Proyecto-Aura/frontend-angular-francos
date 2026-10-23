import { BadgeTone } from '../../../../shared/ds/badge/badge';
import {
  EstadoPedidoDto,
  MetodoPagoDto,
  OrigenPedidoDto,
  TipoEntregaDto,
} from './pedido-dto.interface';

export { money, nf } from '../../catalogo/interfaces/producto.interface';

// ───────────── Etiquetas (RN6) ─────────────

interface Etiqueta<T extends string> {
  value: T;
  label: string;
}

export const ESTADOS_PEDIDO: (Etiqueta<EstadoPedidoDto> & { tone: BadgeTone })[] = [
  { value: 'confirmado', label: 'Confirmado', tone: 'neutral' },
  { value: 'en_espera_inventario', label: 'En espera de inventario', tone: 'warning' },
  { value: 'en_preparacion', label: 'En preparación', tone: 'warning' },
  { value: 'pendiente_entrega', label: 'Pendiente a entrega', tone: 'info' },
  { value: 'en_camino', label: 'En camino', tone: 'info' },
  { value: 'entregado', label: 'Entregado', tone: 'success' },
  { value: 'cancelado', label: 'Cancelado', tone: 'danger' },
];

export const ORIGENES: Etiqueta<OrigenPedidoDto>[] = [
  { value: 'portal', label: 'Portal B' },
  { value: 'manual', label: 'Manual' },
];

export const TIPOS_ENTREGA: Etiqueta<TipoEntregaDto>[] = [
  { value: 'recojo_tienda', label: 'Recojo en tienda' },
  { value: 'delivery', label: 'Delivery' },
];

export const METODOS_PAGO: Etiqueta<MetodoPagoDto>[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'culqi', label: 'Culqi' },
];

const etiquetaDe = <T extends string>(lista: Etiqueta<T>[], valor: T | null): string =>
  lista.find((e) => e.value === valor)?.label ?? '—';

export const estadoLabel = (e: EstadoPedidoDto) => etiquetaDe(ESTADOS_PEDIDO, e);
export const estadoTone = (e: EstadoPedidoDto): BadgeTone =>
  ESTADOS_PEDIDO.find((x) => x.value === e)?.tone ?? 'neutral';
export const origenLabel = (o: OrigenPedidoDto) => etiquetaDe(ORIGENES, o);
export const tipoEntregaLabel = (t: TipoEntregaDto) => etiquetaDe(TIPOS_ENTREGA, t);
export const metodoPagoLabel = (m: MetodoPagoDto | null) => etiquetaDe(METODOS_PAGO, m);

// ───────────── Modelos de pantalla ─────────────

/** Fila del listado de pedidos (RF-A030). */
export interface PedidoFila {
  id: number;
  codigo: string;
  origen: string;
  cliente: string;
  metodoPago: string;
  total: number;
  tipoEntrega: string;
  estado: EstadoPedidoDto;
  creado: Date;
}

export interface PedidoItem {
  sku: string;
  nombre: string;
  cantidad: number;
  precioUnit: number;
  precioAplicado: number;
  subtotal: number;
}

/** Detalle completo de un pedido (RF-A031). */
export interface PedidoDetalle {
  id: number;
  codigo: string;
  cliente: string;
  origen: string;
  estado: EstadoPedidoDto;
  tipoEntrega: string;
  direccion: string | null;
  total: number;
  creado: Date;
  items: PedidoItem[];
  pago: {
    metodo: string;
    monto: number;
    operacion: string | null;
    fecha: Date;
    comprobante: string | null;
  } | null;
}

export interface FiltrosPedidos {
  estado: EstadoPedidoDto | '';
  origen: OrigenPedidoDto | '';
  /** YYYY-MM-DD. */
  desde: string;
  hasta: string;
}

export const FILTROS_VACIOS: FiltrosPedidos = { estado: '', origen: '', desde: '', hasta: '' };

/** Cliente activo que se puede elegir al registrar un pedido. */
export interface ClienteOpcion {
  id: string;
  nombre: string;
  documento: string;
  direccion: string;
}

/** Presentación activa que se puede vender, con sus precios vigentes. */
export interface PresentacionOpcion {
  id: number;
  sku: string;
  nombre: string;
  precioUnit: number;
  precioMayor: number | null;
  umbral: number | null;
}

export interface ItemForm {
  presentacionId: string;
  cantidad: string;
}

export interface PedidoFormModel {
  clienteId: string;
  items: ItemForm[];
  tipoEntrega: TipoEntregaDto;
  direccion: string;
  metodoPago: MetodoPagoDto;
}

export const itemVacio = (): ItemForm => ({ presentacionId: '', cantidad: '1' });

export const pedidoFormVacio = (): PedidoFormModel => ({
  clienteId: '',
  items: [itemVacio()],
  tipoEntrega: 'recojo_tienda',
  direccion: '',
  metodoPago: 'efectivo',
});

export interface ResultadoGuardado {
  mensaje: string;
  tono: 'ok' | 'error';
}

// ───────────── Reglas ─────────────

const esEnteroPositivo = (valor: string) => /^\d+$/.test(valor.trim()) && Number(valor) >= 1;

/**
 * RN17, igual que el backend: el precio mayorista se aplica cuando la cantidad
 * supera el umbral. En pantalla es solo una estimación; el total oficial es el
 * que devuelve la API al registrar.
 */
export function precioEstimado(p: PresentacionOpcion, cantidad: number): number {
  return p.precioMayor !== null && p.umbral !== null && cantidad > p.umbral
    ? p.precioMayor
    : p.precioUnit;
}

/** Subtotal en céntimos para no arrastrar errores de coma flotante. */
const centimos = (n: number) => Math.round(n * 100);

export function subtotalEstimado(p: PresentacionOpcion, cantidad: number): number {
  return (centimos(precioEstimado(p, cantidad)) * cantidad) / 100;
}

/** RF-A033: suma de los ítems válidos del formulario. */
export function totalEstimado(form: PedidoFormModel, opciones: PresentacionOpcion[]): number {
  const suma = form.items.reduce((acc, item) => {
    const p = opciones.find((o) => String(o.id) === item.presentacionId);
    if (!p || !esEnteroPositivo(item.cantidad)) return acc;
    return acc + centimos(subtotalEstimado(p, Number(item.cantidad)));
  }, 0);
  return suma / 100;
}

/** Lo mismo que valida la API, para avisar antes de enviar (RF-A032). */
export function validarPedido(form: PedidoFormModel): string[] {
  const errores: string[] = [];

  if (!form.clienteId) errores.push('cliente');

  const elegidos = form.items.filter((i) => i.presentacionId);
  if (elegidos.length === 0) errores.push('al menos un producto');
  if (form.items.some((i) => !i.presentacionId) && elegidos.length > 0) {
    errores.push('producto en cada fila');
  }
  if (form.items.some((i) => !esEnteroPositivo(i.cantidad))) {
    errores.push('cantidad entera mayor a 0');
  }
  if (new Set(elegidos.map((i) => i.presentacionId)).size !== elegidos.length) {
    errores.push('productos sin repetir (ajusta la cantidad)');
  }
  if (form.tipoEntrega === 'delivery' && !form.direccion.trim()) {
    errores.push('dirección de entrega');
  }

  return errores;
}

export const fechaHora = (d: Date): string =>
  d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
