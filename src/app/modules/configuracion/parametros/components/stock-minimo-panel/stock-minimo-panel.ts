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
import { LucidePencil, LucideSearch } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';

import { AvisoBanner } from '../../../../ventas/catalogo/components/aviso-banner/aviso-banner';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { Button } from '../../../../../shared/ds/button/button';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import {
  ETIQUETA_NIVEL,
  ItemStockMinimo,
  NivelAlerta,
  TipoStock,
  formatearCantidad,
  nivelDe,
} from '../../interfaces/stock-minimo.interface';
import { StockMinimoService, TAMANIO_PAGINA_STOCK } from '../../services/stock-minimo.service';
import { StockMinimoModal } from '../stock-minimo-modal/stock-minimo-modal';

interface RowCtx {
  $implicit: FilaStock;
  index: number;
}

/** Fila de la tabla: el ítem con los textos y el nivel ya calculados. */
interface FilaStock extends ItemStockMinimo {
  actualTexto: string;
  minimoTexto: string;
  maximoTexto: string;
  nivel: NivelAlerta;
}

const TONO_NIVEL: Record<NivelAlerta, BadgeTone> = {
  agotado: 'danger',
  bajo: 'warning',
  normal: 'success',
  alto: 'info',
};

@Component({
  imports: [
    AvisoBanner,
    Badge,
    Button,
    CellStack,
    DataTable,
    FilterBar,
    Icon,
    IconButton,
    Input,
    Pagination,
    Select,
    StockMinimoModal,
    Tabs,
  ],
  selector: 'app-stock-minimo-panel',
  templateUrl: './stock-minimo-panel.html',
})
export class StockMinimoPanel implements OnInit, AfterViewInit {
  private stockService = inject(StockMinimoService);
  private destroyRef = inject(DestroyRef);
  private peticion?: Subscription;

  @ViewChild('itemCell', { static: true }) itemCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('nivelCell', { static: true }) nivelCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  protected readonly LucidePencil = LucidePencil;
  protected readonly LucideSearch = LucideSearch;
  protected readonly tamanioPagina = TAMANIO_PAGINA_STOCK;

  // --- Datos ---
  protected readonly items = signal<ItemStockMinimo[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly aviso = signal<{ mensaje: string; tono: 'ok' | 'error' }>({
    mensaje: '',
    tono: 'ok',
  });

  // --- Filtros ---
  protected readonly tipo = signal<TipoStock>('productos');
  protected readonly busqueda = signal('');
  protected readonly nivelFiltro = signal<NivelAlerta | ''>('');
  protected readonly pestanas: DsTab[] = [
    { id: 'productos', label: 'Productos terminados' },
    { id: 'insumos', label: 'Insumos' },
  ];
  protected readonly opcionesNivel: SelectOption[] = [
    { value: '', label: 'Todos los niveles' },
    ...(Object.keys(ETIQUETA_NIVEL) as NivelAlerta[]).map((nivel) => ({
      value: nivel,
      label: ETIQUETA_NIVEL[nivel],
    })),
  ];
  protected readonly placeholderBusqueda = computed(() =>
    this.tipo() === 'insumos' ? 'Buscar por nombre o SKU' : 'Buscar por producto o SKU',
  );
  protected readonly etiquetaResultado = computed(() => {
    const total = this.total();
    const singular = this.tipo() === 'insumos' ? 'insumo' : 'producto';
    return `${total} ${total === 1 ? singular : singular + 's'}`;
  });
  protected readonly notaTipo = computed(() =>
    this.tipo() === 'insumos'
      ? 'En insumos el mínimo y el máximo son obligatorios.'
      : 'En productos terminados el stock se cuenta en unidades por presentación; el mínimo inicia en 1 und y el máximo es opcional.',
  );

  protected readonly filas = computed<FilaStock[]>(() =>
    this.items().map((item) => ({
      ...item,
      actualTexto: formatearCantidad(item.stockActual, item.unidad),
      minimoTexto: formatearCantidad(item.stockMinimo, item.unidad),
      maximoTexto:
        item.stockMaximo === null ? 'Sin máximo' : formatearCantidad(item.stockMaximo, item.unidad),
      nivel: nivelDe(item),
    })),
  );

  protected readonly columns = signal<DsColumn[]>([
    { key: 'item', header: 'Producto / insumo' },
    { key: 'actualTexto', header: 'Stock actual', numeric: true },
    { key: 'minimoTexto', header: 'Stock mínimo', numeric: true, strong: true },
    { key: 'maximoTexto', header: 'Stock máximo', numeric: true },
    { key: 'nivel', header: 'Nivel', width: '140px' },
    { key: 'acciones', header: '', width: '72px', align: 'right' },
  ]);

  // --- Modal ---
  protected readonly itemEnEdicion = signal<ItemStockMinimo | null>(null);

  ngOnInit(): void {
    this.cargar(1);
  }

  ngAfterViewInit(): void {
    this.columns.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'item') return { ...columna, cellTemplate: this.itemCellTpl };
        if (columna.key === 'nivel') return { ...columna, cellTemplate: this.nivelCellTpl };
        if (columna.key === 'acciones') return { ...columna, cellTemplate: this.accionesCellTpl };
        return columna;
      }),
    );
  }

  protected cargar(pagina = this.pagina()): void {
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set('');
    this.peticion = this.stockService
      .listar(this.tipo(), pagina, this.busqueda(), this.nivelFiltro())
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.items.set(resultado.items);
          this.total.set(resultado.total);
          this.pagina.set(resultado.pagina);
          this.totalPaginas.set(Math.max(resultado.totalPaginas, 1));
        },
        error: (error: unknown) =>
          this.errorCarga.set(apiErrorMessage(error, 'No se pudo cargar el stock.')),
      });
  }

  // --- Filtros ---
  protected cambiarTipo(valor: string): void {
    this.tipo.set(valor === 'insumos' ? 'insumos' : 'productos');
    this.busqueda.set('');
    this.nivelFiltro.set('');
    this.cargar(1);
  }

  protected cambiarNivel(valor: string): void {
    this.nivelFiltro.set(valor as NivelAlerta | '');
    this.cargar(1);
  }

  protected cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.cargar(1);
  }

  protected cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  // --- Celdas ---
  protected etiquetaNivel = (nivel: NivelAlerta) => ETIQUETA_NIVEL[nivel];
  protected tonoNivel = (nivel: NivelAlerta) => TONO_NIVEL[nivel];

  // --- Acciones ---
  protected editar(item: ItemStockMinimo): void {
    this.itemEnEdicion.set(item);
  }

  protected alGuardar(item: ItemStockMinimo): void {
    this.mostrarAviso(`Stock de alerta de ${item.nombre} actualizado`);
    this.cargar();
  }

  protected mostrarAviso(mensaje: string, tono: 'ok' | 'error' = 'ok'): void {
    this.aviso.set({ mensaje, tono });
  }

  protected cerrarAviso(): void {
    this.aviso.set({ mensaje: '', tono: 'ok' });
  }
}
