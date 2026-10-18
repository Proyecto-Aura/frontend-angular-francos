import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { LucideEye } from '@lucide/angular';

import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Field } from '../../../../../shared/ds/field/field';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { AvisoBanner } from '../../../catalogo/components/aviso-banner/aviso-banner';
import { ReembolsoDetalle } from '../../components/reembolso-detalle/reembolso-detalle';
import { ResultadoGuardado, money } from '../../interfaces/pedido.interface';
import { EstadoReembolsoDto } from '../../interfaces/reembolso-dto.interface';
import {
  ESTADOS_REEMBOLSO,
  FILTROS_REEMBOLSO_VACIOS,
  FiltrosReembolsos,
  ReembolsoFila,
  estadoReembolsoLabel,
  estadoReembolsoTone,
  fechaDia,
} from '../../interfaces/reembolso.interface';
import { ReembolsosService } from '../../services/reembolsos.service';

const POR_PAGINA = 10;
// Espera tras la última tecla antes de buscar, para no consultar en cada letra.
const ESPERA_BUSQUEDA_MS = 300;

interface RowCtx {
  $implicit: ReembolsoFila;
  index: number;
}

const SIN_AVISO: ResultadoGuardado = { mensaje: '', tono: 'ok' };

/** HU-A-011: solicitudes de reembolso (RF-A039), filtros (RF-A040) y su gestión desde el detalle. */
@Component({
  imports: [
    AvisoBanner,
    Avatar,
    Badge,
    Button,
    DataTable,
    Field,
    FilterBar,
    Icon,
    IconButton,
    Input,
    Pagination,
    ReembolsoDetalle,
    Select,
  ],
  selector: 'app-reembolsos',
  templateUrl: './reembolsos.html',
})
export class Reembolsos implements AfterViewInit, OnInit {
  private reembolsosService = inject(ReembolsosService);

  @ViewChild('solicitudCell', { static: true }) solicitudCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('pedidoCell', { static: true }) pedidoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('clienteCell', { static: true }) clienteCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('importeCell', { static: true }) importeCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('fechaCell', { static: true }) fechaCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  readonly LucideEye = LucideEye;

  protected readonly money = money;
  protected readonly fechaDia = fechaDia;
  protected readonly estadoLabel = estadoReembolsoLabel;
  protected readonly estadoTone = estadoReembolsoTone;

  protected solicitudes = this.reembolsosService.solicitudes;
  protected total = this.reembolsosService.total;
  protected cargando = this.reembolsosService.cargando;
  protected errorCarga = this.reembolsosService.errorCarga;

  // --- Filtros (RF-A040) ---
  protected filtros = signal<FiltrosReembolsos>(FILTROS_REEMBOLSO_VACIOS);
  protected page = signal(1);
  protected readonly pageSize = POR_PAGINA;
  /** Total sin filtros, para el resumen "3 de 5 solicitudes". */
  private totalGeneral = signal<number | null>(null);

  protected readonly estadoOptions: SelectOption[] = ESTADOS_REEMBOLSO.map((e) => ({
    value: e.value,
    label: e.label,
  }));

  protected hayFiltros = computed(() => {
    const f = this.filtros();
    return Boolean(f.q.trim() || f.estado || f.fecha);
  });

  protected resumen = computed(() => {
    const total = this.total();
    const general = this.totalGeneral();
    const sufijo = (n: number) => (n === 1 ? 'solicitud' : 'solicitudes');
    if (!this.hayFiltros() || general === null) return `${total} ${sufijo(total)}`;
    return `${total} de ${general} ${sufijo(general)}`;
  });

  protected pageCount = computed(() => Math.max(1, Math.ceil(this.total() / POR_PAGINA)));

  protected columns = signal<DsColumn[]>([
    { key: 'solicitud', header: 'Solicitud', width: '164px' },
    { key: 'pedido', header: 'Pedido', width: '152px' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'importe', header: 'Importe solicitado', width: '176px', align: 'right' },
    { key: 'estado', header: 'Estado', width: '146px' },
    { key: 'fecha', header: 'Fecha', width: '126px' },
    { key: 'acciones', header: 'Acciones', width: '100px', align: 'right' },
  ]);

  // --- Modal ---
  protected reembolsoDetalleId = signal<number | null>(null);
  protected aviso = signal<ResultadoGuardado>(SIN_AVISO);

  private busqueda: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.busqueda));

    // Cada carga sin filtros deja al día el total general del resumen.
    effect(() => {
      if (!this.hayFiltros() && !this.cargando() && !this.errorCarga()) {
        this.totalGeneral.set(this.total());
      }
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    const plantillas: Record<string, TemplateRef<RowCtx>> = {
      solicitud: this.solicitudCellTpl,
      pedido: this.pedidoCellTpl,
      cliente: this.clienteCellTpl,
      importe: this.importeCellTpl,
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
    this.reembolsosService.listar(this.filtros(), this.page(), POR_PAGINA);
  }

  // Cada cambio de filtro vuelve a la página 1 y consulta de nuevo.
  private setFiltro(cambio: Partial<FiltrosReembolsos>) {
    clearTimeout(this.busqueda);
    this.filtros.update((f) => ({ ...f, ...cambio }));
    this.page.set(1);
    this.cargar();
  }

  protected setQ(v: string) {
    this.filtros.update((f) => ({ ...f, q: v }));
    clearTimeout(this.busqueda);
    this.busqueda = setTimeout(() => this.setFiltro({}), ESPERA_BUSQUEDA_MS);
  }
  protected setEstado(v: string) {
    this.setFiltro({ estado: v as EstadoReembolsoDto | '' });
  }
  protected setFecha(v: string) {
    this.setFiltro({ fecha: v });
  }
  protected limpiarFiltros() {
    this.setFiltro(FILTROS_REEMBOLSO_VACIOS);
  }

  protected cambiarPagina(page: number) {
    this.page.set(page);
    this.cargar();
  }

  protected verSolicitud(fila: ReembolsoFila) {
    this.reembolsoDetalleId.set(fila.id);
  }

  /** Aviso de lo hecho desde el detalle; si salió bien, el listado se recarga con el estado nuevo. */
  protected cambio(resultado: ResultadoGuardado) {
    this.aviso.set(resultado);
    if (resultado.tono === 'ok') this.cargar();
  }

  protected cerrarAviso() {
    this.aviso.set(SIN_AVISO);
  }
}
