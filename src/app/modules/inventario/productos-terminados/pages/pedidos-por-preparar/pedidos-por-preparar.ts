import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideClock,
  LucideEye,
  LucideFolderOpen,
  LucidePackage,
  LucidePackageCheck,
  LucidePlay,
  LucideSearch,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { PedidoPrepararDetalleModal } from '../../components/pedido-preparar-detalle-modal/pedido-preparar-detalle-modal';
import {
  DisponibilidadPedidoPreparar,
  EstadoPedidoPreparar,
  PedidoPreparar,
  ResumenPedidosPorPreparar,
} from '../../interfaces/pedido-preparar.interface';
import {
  etiquetaDisponibilidadPedidoPreparar,
  etiquetaEstadoPedidoPreparar,
  tonoEstadoPedidoPreparar,
} from '../../mappers/pedido-preparar.mapper';
import { PedidoPrepararService } from '../../services/pedido-preparar.service';

interface FilaPedidoPreparar {
  pedido: PedidoPreparar;
  codigo: string;
  horaMostrada: string;
  fechaMostrada: string;
  cliente: string;
  cantidadProductos: number;
  cantidadUnidades: number;
  estado: EstadoPedidoPreparar;
  disponibilidad: DisponibilidadPedidoPreparar;
}

const RESUMEN_VACIO: ResumenPedidosPorPreparar = {
  enEsperaInventario: 0,
  enPreparacion: 0,
  pendienteEntrega: 0,
};

const DEMORA_AUTOCIERRE_TOAST_MS = 4500;
const DEMORA_SALIDA_TOAST_MS = 300;

// "Pedidos por preparar" (OFT0-260, fila de acciones agregada en OFT0-262):
// vista de inventario sobre los pedidos de venta que ya pasaron por
// confirmacion y esperan que el operario de productos terminados los
// prepare — 3 KPIs + filtros + tabla, mismo patron visual que
// solicitudes-produccion. Consume InventarioPedidosController (confirmado
// por el backend, contrato aparte de /pedidos de ventas aunque es la misma
// entidad Pedido).
//
// Acciones en la fila (sin abrir el modal primero): "Iniciar preparación"
// hace el PATCH .../en-preparacion directo, deshabilitado salvo que
// disponibilidad === 'completo' (campo de 3 estados agregado al listado en
// OFT0-262 — completo/parcial/sin_stock, mismo criterio centralizado que ya
// usa el backend para el detalle; "parcial" y "sin_stock" bloquean igual).
// Una vez "en_preparacion", el boton pasa a abrir el modal (ahi vive el
// form de cantidades preparadas, necesario para "pendiente_entrega" — no se
// puede hacer de un solo click porque requiere que el operario
// confirme/ajuste cantidades por item).
@Component({
  imports: [
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    FilterBar,
    Icon,
    IconButton,
    Input,
    KpiCard,
    PedidoPrepararDetalleModal,
    Pagination,
    Select,
  ],
  selector: 'app-pedidos-por-preparar',
  templateUrl: './pedidos-por-preparar.html',
})
export class PedidosPorPreparar implements OnInit, AfterViewInit, OnDestroy {
  private pedidoService = inject(PedidoPrepararService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('pedidoCell', { static: true })
  pedidoCellTpl!: TemplateRef<{ $implicit: FilaPedidoPreparar; index: number }>;

  @ViewChild('clienteCell', { static: true })
  clienteCellTpl!: TemplateRef<{ $implicit: FilaPedidoPreparar; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: FilaPedidoPreparar; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: FilaPedidoPreparar; index: number }>;

  readonly LucideClock = LucideClock;
  readonly LucideEye = LucideEye;
  readonly LucideFolderOpen = LucideFolderOpen;
  readonly LucidePackage = LucidePackage;
  readonly LucidePackageCheck = LucidePackageCheck;
  readonly LucidePlay = LucidePlay;
  readonly LucideSearch = LucideSearch;

  // Id del pedido cuyo PATCH .../en-preparacion esta en vuelo (iniciado
  // directo desde la fila, sin pasar por el modal) — deshabilita esa fila
  // para evitar doble click mientras responde.
  iniciandoId = signal<number | null>(null);

  // Toast flotante arriba a la derecha: éxito (verde) o error de la API (rojo).
  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  toastVisible = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toastSalidaTimer: ReturnType<typeof setTimeout> | null = null;

  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastSalidaTimer) clearTimeout(this.toastSalidaTimer);

    this.toast.set({ tone, title, description });
    this.toastVisible.set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => this.toastVisible.set(true)));

    this.toastTimer = setTimeout(() => this.cerrarToast(), DEMORA_AUTOCIERRE_TOAST_MS);
  }

  cerrarToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastVisible.set(false);
    this.toastSalidaTimer = setTimeout(() => this.toast.set(null), DEMORA_SALIDA_TOAST_MS);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastSalidaTimer) clearTimeout(this.toastSalidaTimer);
  }

  readonly tamanioPagina = 10;

  readonly estadoOptions: SelectOption[] = [
    { value: 'en_espera_inventario', label: 'En espera de inventario' },
    { value: 'en_preparacion', label: 'En preparación' },
    { value: 'pendiente_entrega', label: 'Pendiente a entrega' },
  ];

  // Filtros de GET /inventario/pedidos; los extremos del rango son opcionales.
  search = signal('');
  estadoFiltro = signal('');
  fechaDesde = signal('');
  fechaHasta = signal('');
  rangoInvalido = computed(() =>
    Boolean(this.fechaDesde() && this.fechaHasta() && this.fechaDesde() > this.fechaHasta()),
  );

  columnas = signal<DsColumn[]>([]);
  pedidos = signal<FilaPedidoPreparar[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  resumen = signal<ResumenPedidosPorPreparar>(RESUMEN_VACIO);

  // null = cerrado. Se abre con el id de la fila clickeada; el modal pide
  // GET /inventario/pedidos/:id por su cuenta. modoDetalle decide si abre
  // de solo lectura ("Ver detalle", nunca cambia aunque cambie el estado) o
  // editable ("Marcar pendiente de entrega", solo desde ese icono de fila).
  pedidoDetalleId = signal<number | null>(null);
  modoDetalle = signal<'ver' | 'preparar'>('ver');

  ngOnInit(): void {
    this.cargarPedidos();
    this.cargarResumen();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigo', header: 'Pedido', cellTemplate: this.pedidoCellTpl },
      { key: 'fechaMostrada', header: 'Fecha', muted: true },
      { key: 'cliente', header: 'Cliente', cellTemplate: this.clienteCellTpl },
      { key: 'cantidadProductos', header: 'Productos', numeric: true },
      { key: 'cantidadUnidades', header: 'Unidades', numeric: true },
      { key: 'estado', header: 'Estado preparación', cellTemplate: this.estadoCellTpl },
      { key: 'acciones', header: 'Acciones', align: 'right', cellTemplate: this.accionesCellTpl },
    ]);
  }

  cargarPedidos(pagina = this.pagina()): void {
    if (this.rangoInvalido()) return;
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.pedidoService
      .listar(pagina, this.tamanioPagina, {
        search: this.search().trim() || undefined,
        estado: (this.estadoFiltro() as EstadoPedidoPreparar) || undefined,
        fechaDesde: this.fechaDesde() || undefined,
        fechaHasta: this.fechaHasta() || undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.pedidos.set(resultado.pedidos.map((p) => this.aFila(p)));
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.pedidos.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  cargarResumen(): void {
    this.pedidoService
      .indicadores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => this.resumen.set(resumen),
        error: () => this.resumen.set(RESUMEN_VACIO),
      });
  }

  recargarTodo(): void {
    this.cargarPedidos(this.pagina());
    this.cargarResumen();
  }

  setSearch(valor: string): void {
    this.search.set(valor);
    this.cargarPedidos(1);
  }

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarPedidos(1);
  }

  setFechaDesde(valor: string): void {
    this.fechaDesde.set(valor);
    this.cargarPedidos(1);
  }

  setFechaHasta(valor: string): void {
    this.fechaHasta.set(valor);
    this.cargarPedidos(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarPedidos(pagina);
    }
  }

  verDetalle(pedido: PedidoPreparar): void {
    this.modoDetalle.set('ver');
    this.pedidoDetalleId.set(pedido.id);
  }

  abrirEntrega(pedido: PedidoPreparar): void {
    this.modoDetalle.set('preparar');
    this.pedidoDetalleId.set(pedido.id);
  }

  cerrarDetalle(): void {
    this.pedidoDetalleId.set(null);
  }

  pedidoActualizado(aviso: { titulo: string; mensaje: string }): void {
    this.mostrarToast('success', aviso.titulo, aviso.mensaje);
    this.recargarTodo();
  }

  estadoLabel(estado: EstadoPedidoPreparar): string {
    return etiquetaEstadoPedidoPreparar(estado);
  }

  estadoTone(estado: EstadoPedidoPreparar): BadgeTone {
    return tonoEstadoPedidoPreparar(estado);
  }

  // "Iniciar preparación" directo desde la fila (sin abrir el modal) —
  // mismo PATCH que ya usaba el modal, solo que ahora tambien se puede
  // disparar desde aca. El modal sigue siendo el unico lugar donde se
  // confirma "pendiente_entrega" (necesita las cantidades preparadas por
  // item, eso si requiere abrir el form).
  iniciarPreparacion(fila: FilaPedidoPreparar): void {
    if (fila.disponibilidad !== 'completo' || this.iniciandoId() !== null) return;

    this.iniciandoId.set(fila.pedido.id);
    this.pedidoService
      .marcarEnPreparacion(fila.pedido.id)
      .pipe(
        finalize(() => this.iniciandoId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.mostrarToast('success', 'Pedido en preparación', fila.codigo);
          this.recargarTodo();
        },
        error: (error) => {
          this.mostrarToast(
            'error',
            error.status === 409
              ? 'El pedido ya cambió de estado. Se actualizará la lista.'
              : 'No se pudo iniciar la preparación. Intenta nuevamente.',
          );
          if (error.status === 409) this.recargarTodo();
        },
      });
  }

  tooltipIniciar(fila: FilaPedidoPreparar): string {
    return fila.disponibilidad === 'completo'
      ? 'Iniciar preparación'
      : etiquetaDisponibilidadPedidoPreparar(fila.disponibilidad);
  }

  private aFila(p: PedidoPreparar): FilaPedidoPreparar {
    return {
      pedido: p,
      codigo: p.codigo,
      horaMostrada: this.formatearHora(p.fechaCreacion),
      fechaMostrada: this.formatearFecha(p.fechaCreacion),
      cliente: p.clienteNombre,
      cantidadProductos: p.cantidadProductos,
      cantidadUnidades: p.cantidadUnidades,
      estado: p.estado,
      disponibilidad: p.disponibilidad,
    };
  }

  private formatearFecha(fechaIso: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(fechaIso));
  }

  private formatearHora(fechaIso: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(fechaIso));
  }
}
