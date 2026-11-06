import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCheck, LucideEye, LucideTruck } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { DespachoDetalleModal } from '../../components/despacho-detalle-modal/despacho-detalle-modal';
import {
  DespachoPedido,
  EstadoDespacho,
  ResumenDespacho,
} from '../../interfaces/despacho-pedido.interface';
import { etiquetaEstadoDespacho, tonoEstadoDespacho } from '../../mappers/despacho-pedido.mapper';
import { DespachoPedidoService } from '../../services/despacho-pedido.service';

interface FilaDespacho {
  pedido: DespachoPedido;
  codigo: string;
  horaMostrada: string;
  fechaMostrada: string;
  cliente: string;
  cantidadProductos: number;
  cantidadUnidades: number;
  estado: EstadoDespacho;
  entregaMostrada: string;
}

const RESUMEN_VACIO: ResumenDespacho = { pendienteEntrega: 0, enCamino: 0, entregado: 0 };

// "Despachos" (HU-A-023, RF-A094 a RF-A098): lista de los pedidos que el
// operador de inventario dejó pendientes a entregar, los que van en camino y
// los ya entregados, con tres tarjetas de resumen, filtro por estado y tabla
// paginada en orden de llegada. Las acciones (iniciar despacho, marcar como
// entregado) viven en el modal de detalle, que se abre con el ojo de la fila.
//
// Diferencias con el prototipo: el backend solo filtra por estado, así que no
// hay búsqueda por pedido o cliente ni filtro por fechas; y las tarjetas
// cuentan los entregados en total, no "entregados hoy".
@Component({
  imports: [
    Avatar,
    Badge,
    Button,
    Card,
    CellStack,
    DataTable,
    DespachoDetalleModal,
    FilterBar,
    Icon,
    IconButton,
    KpiCard,
    Pagination,
    Select,
  ],
  selector: 'app-despacho-pedidos',
  templateUrl: './despacho-pedidos.html',
})
export class DespachoPedidos implements OnInit, AfterViewInit {
  private despachoService = inject(DespachoPedidoService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('pedidoCell', { static: true })
  pedidoCellTpl!: TemplateRef<{ $implicit: FilaDespacho; index: number }>;

  @ViewChild('clienteCell', { static: true })
  clienteCellTpl!: TemplateRef<{ $implicit: FilaDespacho; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: FilaDespacho; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: FilaDespacho; index: number }>;

  readonly LucideCheck = LucideCheck;
  readonly LucideEye = LucideEye;
  readonly LucideTruck = LucideTruck;

  readonly tamanioPagina = 10;

  readonly estadoOptions: SelectOption[] = [
    { value: 'pendiente_entrega', label: 'Pendiente a entregar' },
    { value: 'en_camino', label: 'En camino' },
    { value: 'entregado', label: 'Entregado' },
  ];

  estadoFiltro = signal('');

  columnas = signal<DsColumn[]>([]);
  pedidos = signal<FilaDespacho[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  resumen = signal<ResumenDespacho>(RESUMEN_VACIO);

  /** null = cerrado. */
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
      { key: 'estado', header: 'Estado entrega', cellTemplate: this.estadoCellTpl },
      { key: 'entregaMostrada', header: 'Entregado el', muted: true },
      { key: 'acciones', header: 'Acciones', align: 'right', cellTemplate: this.accionesCellTpl },
    ]);
  }

  cargarPedidos(pagina = this.pagina()): void {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.despachoService
      .listar(pagina, this.tamanioPagina, {
        estado: (this.estadoFiltro() as EstadoDespacho) || undefined,
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
    this.despachoService
      .resumen()
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

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarPedidos(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarPedidos(pagina);
    }
  }

  verDetalle(pedido: DespachoPedido): void {
    this.pedidoDetalleId.set(pedido.id);
  }

  cerrarDetalle(): void {
    this.pedidoDetalleId.set(null);
  }

  pedidoActualizado(): void {
    this.recargarTodo();
  }

  estadoLabel(estado: EstadoDespacho): string {
    return etiquetaEstadoDespacho(estado);
  }

  estadoTone(estado: EstadoDespacho): BadgeTone {
    return tonoEstadoDespacho(estado);
  }

  private aFila(p: DespachoPedido): FilaDespacho {
    return {
      pedido: p,
      codigo: p.codigo,
      horaMostrada: this.formatearHora(p.fechaCreacion),
      fechaMostrada: this.formatearFecha(p.fechaCreacion),
      cliente: p.clienteNombre,
      cantidadProductos: p.cantidadProductos,
      cantidadUnidades: p.cantidadUnidades,
      estado: p.estado,
      entregaMostrada: p.fechaEntrega ? this.formatearFecha(p.fechaEntrega) : '—',
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
