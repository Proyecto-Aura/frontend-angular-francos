import {
  AfterViewInit,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { LucideEye, LucidePlus } from '@lucide/angular';

import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { AvisoBanner } from '../../../catalogo/components/aviso-banner/aviso-banner';
import { PedidoDetalle } from '../../components/pedido-detalle/pedido-detalle';
import { PedidoForm } from '../../components/pedido-form/pedido-form';
import { EstadoPedidoDto, OrigenPedidoDto } from '../../interfaces/pedido-dto.interface';
import {
  ESTADOS_PEDIDO,
  FILTROS_VACIOS,
  FiltrosPedidos,
  ORIGENES,
  PedidoFila,
  ResultadoGuardado,
  estadoLabel,
  estadoTone,
  fechaHora,
  money,
} from '../../interfaces/pedido.interface';
import { PedidosService } from '../../services/pedidos.service';

const POR_PAGINA = 10;

interface RowCtx {
  $implicit: PedidoFila;
  index: number;
}

const SIN_AVISO: ResultadoGuardado = { mensaje: '', tono: 'ok' };

/** HU-A-009: listado de pedidos (RF-A030), filtros (RF-A037), detalle y registro manual. */
@Component({
  imports: [
    AvisoBanner,
    Badge,
    Button,
    DataTable,
    FilterBar,
    Icon,
    IconButton,
    Input,
    Pagination,
    PedidoDetalle,
    PedidoForm,
    Select,
  ],
  selector: 'app-gestion-pedidos',
  templateUrl: './gestion-pedidos.html',
})
export class GestionPedidos implements AfterViewInit, OnInit {
  private pedidosService = inject(PedidosService);

  @ViewChild('codigoCell', { static: true }) codigoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('totalCell', { static: true }) totalCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('fechaCell', { static: true }) fechaCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  readonly LucideEye = LucideEye;
  readonly LucidePlus = LucidePlus;

  protected readonly money = money;
  protected readonly fechaHora = fechaHora;
  protected readonly estadoLabel = estadoLabel;
  protected readonly estadoTone = estadoTone;

  protected pedidos = this.pedidosService.pedidos;
  protected total = this.pedidosService.total;
  protected cargando = this.pedidosService.cargando;
  protected errorCarga = this.pedidosService.errorCarga;

  // --- Filtros (RF-A037) ---
  protected filtros = signal<FiltrosPedidos>(FILTROS_VACIOS);
  protected page = signal(1);
  protected readonly pageSize = POR_PAGINA;

  protected readonly estadoOptions: SelectOption[] = ESTADOS_PEDIDO.map((e) => ({
    value: e.value,
    label: e.label,
  }));
  protected readonly origenOptions: SelectOption[] = ORIGENES.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  protected hayFiltros = computed(() => {
    const f = this.filtros();
    return Boolean(f.estado || f.origen || f.desde || f.hasta);
  });

  /** Un rango invertido no se envía: la API lo rechazaría con 400. */
  protected rangoInvalido = computed(() => {
    const { desde, hasta } = this.filtros();
    return Boolean(desde && hasta && desde > hasta);
  });

  protected pageCount = computed(() => Math.max(1, Math.ceil(this.total() / POR_PAGINA)));

  protected columns = signal<DsColumn[]>([
    { key: 'codigo', header: 'Código', width: '150px' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'metodoPago', header: 'Tipo de pago', width: '130px' },
    { key: 'total', header: 'Total', width: '130px', align: 'right' },
    { key: 'tipoEntrega', header: 'Tipo de entrega', width: '150px' },
    { key: 'estado', header: 'Estado', width: '200px' },
    { key: 'fecha', header: 'Fecha de creación', width: '170px' },
    { key: 'acciones', header: 'Acciones', width: '100px', align: 'right' },
  ]);

  // --- Modales ---
  protected formAbierto = signal(false);
  protected pedidoDetalleId = signal<number | null>(null);
  protected aviso = signal<ResultadoGuardado>(SIN_AVISO);

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    const plantillas: Record<string, TemplateRef<RowCtx>> = {
      codigo: this.codigoCellTpl,
      total: this.totalCellTpl,
      estado: this.estadoCellTpl,
      fecha: this.fechaCellTpl,
      acciones: this.accionesCellTpl,
    };
    this.columns.update((cols) =>
      cols.map((col) =>
        plantillas[col.key] ? { ...col, cellTemplate: plantillas[col.key] } : col,
      ),
    );
  }

  protected cargar() {
    if (this.rangoInvalido()) return;
    this.pedidosService.listar(this.filtros(), this.page(), POR_PAGINA);
  }

  // Cada cambio de filtro vuelve a la página 1 y consulta de nuevo.
  private setFiltro(cambio: Partial<FiltrosPedidos>) {
    this.filtros.update((f) => ({ ...f, ...cambio }));
    this.page.set(1);
    this.cargar();
  }

  protected setEstado(v: string) {
    this.setFiltro({ estado: v as EstadoPedidoDto | '' });
  }
  protected setOrigen(v: string) {
    this.setFiltro({ origen: v as OrigenPedidoDto | '' });
  }
  protected setDesde(v: string) {
    this.setFiltro({ desde: v });
  }
  protected setHasta(v: string) {
    this.setFiltro({ hasta: v });
  }
  protected limpiarFiltros() {
    this.filtros.set(FILTROS_VACIOS);
    this.page.set(1);
    this.cargar();
  }

  protected cambiarPagina(page: number) {
    this.page.set(page);
    this.cargar();
  }

  protected verPedido(fila: PedidoFila) {
    this.pedidoDetalleId.set(fila.id);
  }

  protected nuevoPedido() {
    this.formAbierto.set(true);
  }

  /** Tras registrar: aviso y listado recargado (el pedido nuevo aparece al final, por orden de llegada). */
  protected pedidoRegistrado(resultado: ResultadoGuardado) {
    this.aviso.set(resultado);
    this.cargar();
  }

  protected cerrarAviso() {
    this.aviso.set(SIN_AVISO);
  }

  /** HU-A-010: aviso del cambio de estado hecho desde el detalle; si salió bien, el listado se recarga. */
  protected estadoCambiado(resultado: ResultadoGuardado) {
    this.aviso.set(resultado);
    if (resultado.tono === 'ok') this.cargar();
  }
}
