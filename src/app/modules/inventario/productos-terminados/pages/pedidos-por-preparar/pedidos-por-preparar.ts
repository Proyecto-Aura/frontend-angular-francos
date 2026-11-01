import {
  AfterViewInit,
  Component,
  DestroyRef,
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
  LucideSearch,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { PedidoPrepararDetalleModal } from '../../components/pedido-preparar-detalle-modal/pedido-preparar-detalle-modal';
import {
  EstadoPedidoPreparar,
  PedidoPreparar,
  ResumenPedidosPorPreparar,
} from '../../interfaces/pedido-preparar.interface';
import {
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
}

const RESUMEN_VACIO: ResumenPedidosPorPreparar = {
  enEsperaInventario: 0,
  enPreparacion: 0,
  pendienteEntrega: 0,
};

// "Pedidos por preparar" (OFT0-260): vista de inventario sobre los pedidos
// de venta que ya pasaron por confirmacion y esperan que el operario de
// productos terminados los prepare — 3 KPIs + filtros + tabla, mismo patron
// visual que solicitudes-produccion. Consume InventarioPedidosController
// (confirmado por el backend, contrato aparte de /pedidos de ventas aunque
// es la misma entidad Pedido). Solo lectura + "Ver detalle", que es donde
// vive la unica accion de esta pantalla (avanzar el estado de preparacion,
// ver pedido-preparar-detalle-modal) — el mockup no tiene botones de accion
// en la fila, solo "Ver detalle".
@Component({
  imports: [
    Avatar,
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    FilterBar,
    Icon,
    Input,
    KpiCard,
    PedidoPrepararDetalleModal,
    Pagination,
    Select,
  ],
  selector: 'app-pedidos-por-preparar',
  templateUrl: './pedidos-por-preparar.html',
})
export class PedidosPorPreparar implements OnInit, AfterViewInit {
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
  readonly LucideSearch = LucideSearch;

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

  // null = cerrado. Se abre con el id de la fila clickeada en "Ver detalle";
  // el modal pide GET /inventario/pedidos/:id por su cuenta.
  pedidoDetalleId = signal<number | null>(null);

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
    this.pedidoDetalleId.set(pedido.id);
  }

  cerrarDetalle(): void {
    this.pedidoDetalleId.set(null);
  }

  pedidoActualizado(): void {
    this.recargarTodo();
  }

  estadoLabel(estado: EstadoPedidoPreparar): string {
    return etiquetaEstadoPedidoPreparar(estado);
  }

  estadoTone(estado: EstadoPedidoPreparar): BadgeTone {
    return tonoEstadoPedidoPreparar(estado);
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
