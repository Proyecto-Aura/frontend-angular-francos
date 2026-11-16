import {
  AfterViewInit,
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
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideSearch } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';

import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Switch } from '../../../../../shared/ds/switch/switch';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import {
  EdicionUmbral,
  PresentacionMayorista,
  UMBRAL_MAXIMO,
  UMBRAL_MINIMO,
  validarUmbralPropio,
} from '../../interfaces/parametros-ventas.interface';
import {
  ParametrosVentasService,
  TAMANIO_PAGINA_UMBRALES,
} from '../../services/parametros-ventas.service';

interface RowCtx {
  $implicit: FilaUmbral;
  index: number;
}

/** Fila de la tabla: la presentación con el valor que se ve (el editado, si lo hay). */
interface FilaUmbral extends PresentacionMayorista {
  detalle: string;
  valor: string;
  error: string | null;
  propio: boolean;
}

/** RF-A193: umbral mayorista global y, si se activa, uno propio por presentación. */
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Field, Icon, Input, Pagination, Switch],
  selector: 'app-umbral-mayorista-card',
  templateUrl: './umbral-mayorista-card.html',
})
export class UmbralMayoristaCard implements AfterViewInit {
  private service = inject(ParametrosVentasService);
  private destroyRef = inject(DestroyRef);
  private peticion?: Subscription;

  @ViewChild('productoCell', { static: true }) productoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('umbralCell', { static: true }) umbralCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('aplicaCell', { static: true }) aplicaCellTpl!: TemplateRef<RowCtx>;

  /** Umbral global tal como se está escribiendo (texto, para poder validarlo). */
  umbral = input('');
  porProducto = input(false);
  errorUmbral = input<string | null>(null);
  /** Umbrales propios editados y todavía sin guardar, por id de presentación. */
  ediciones = input<ReadonlyMap<number, EdicionUmbral>>(new Map());
  /** Cada cambio recarga la tabla (la página lo sube después de guardar). */
  recarga = input(0);

  umbralChange = output<string>();
  porProductoChange = output<boolean>();
  edicionChange = output<EdicionUmbral>();

  protected readonly LucideSearch = LucideSearch;
  protected readonly tamanioPagina = TAMANIO_PAGINA_UMBRALES;
  protected readonly rango = `Entre ${UMBRAL_MINIMO} y ${UMBRAL_MAXIMO.toLocaleString('en-US')} unidades`;

  protected readonly items = signal<PresentacionMayorista[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly busqueda = signal('');

  protected readonly filas = computed<FilaUmbral[]>(() =>
    this.items().map((item) => {
      const edicion = this.ediciones().get(item.id);
      const valor = edicion
        ? edicion.valor
        : item.umbralPropio === null
          ? ''
          : String(item.umbralPropio);
      return {
        ...item,
        detalle: `${item.sku} · ${item.presentacion}`,
        valor,
        error: validarUmbralPropio(valor),
        propio: valor.trim() !== '',
      };
    }),
  );

  protected readonly columns = signal<DsColumn[]>([
    { key: 'producto', header: 'Producto' },
    { key: 'umbral', header: 'Umbral', align: 'right', width: '180px' },
    { key: 'aplica', header: 'Aplica', width: '150px' },
  ]);

  constructor() {
    // La primera ejecución hace la carga inicial; luego, cada vez que la página sube `recarga`.
    effect(() => {
      this.recarga();
      untracked(() => this.cargar(this.pagina()));
    });
  }

  ngAfterViewInit(): void {
    this.columns.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'producto') return { ...columna, cellTemplate: this.productoCellTpl };
        if (columna.key === 'umbral') return { ...columna, cellTemplate: this.umbralCellTpl };
        if (columna.key === 'aplica') return { ...columna, cellTemplate: this.aplicaCellTpl };
        return columna;
      }),
    );
  }

  protected cargar(pagina = this.pagina()): void {
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set('');
    this.peticion = this.service
      .listarPresentaciones(pagina, this.busqueda())
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
          this.errorCarga.set(apiErrorMessage(error, 'No se pudieron cargar los productos.')),
      });
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

  protected editar(fila: FilaUmbral, valor: string): void {
    this.edicionChange.emit({ id: fila.id, original: fila.umbralPropio, valor });
  }
}
