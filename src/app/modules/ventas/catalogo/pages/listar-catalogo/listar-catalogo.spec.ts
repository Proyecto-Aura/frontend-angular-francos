import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilaCatalogo, Producto, ResultadoGuardado } from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { API, catalogoDto, flushCatalogo } from '../../testing/catalogo.fixtures';
import { ListarCatalogo } from './listar-catalogo';

// Los miembros de la página son `protected`: el spec los consulta mediante esta vista tipada.
interface ListarCatalogoApi {
  page: WritableSignal<number>;
  vista: Signal<'tarjetas' | 'tabla'>;
  filasFiltradas: Signal<FilaCatalogo[]>;
  filasPagina: Signal<FilaCatalogo[]>;
  pageSize: Signal<number>;
  pageCount: Signal<number>;
  paginaActual: Signal<number>;
  formModo: Signal<'nuevo' | 'editar' | null>;
  productoEnEdicion: Signal<Producto | null>;
  filaDetalle: Signal<FilaCatalogo | null>;
  aviso: Signal<ResultadoGuardado>;
  cargando: Signal<boolean>;
  errorCarga: Signal<boolean>;
  hayProductos: Signal<boolean>;
  setQuery(v: string): void;
  setCategoria(v: string): void;
  setPresentacion(v: string): void;
  setEstado(v: string): void;
  setDisp(v: string): void;
  setVista(v: 'tarjetas' | 'tabla'): void;
  dispTone(f: FilaCatalogo): string;
  dispLabel(f: FilaCatalogo): string;
  dispTexto(f: FilaCatalogo): string;
  estadoTone(estado: FilaCatalogo['estado']): string;
  nuevoProducto(): void;
  editarProducto(f: FilaCatalogo): void;
  cerrarForm(): void;
  verProducto(f: FilaCatalogo): void;
  mostrarAviso(resultado: ResultadoGuardado): void;
  cerrarAviso(): void;
  alternarEstado(f: FilaCatalogo): void;
}

function makeFila(overrides: Partial<FilaCatalogo> = {}): FilaCatalogo {
  return {
    productoId: 1,
    presentacionId: 1,
    productoPresentacionId: 11,
    nombre: 'Chifles clásicos',
    categoria: 'Chifles',
    destacado: true,
    presentacion: '100 gr',
    precioUnit: 5.5,
    precioMayor: 4.2,
    umbral: 24,
    promo: null,
    estado: 'Activo',
    stock: 480,
    visible: false,
    sku: 'FR-P1-PR1',
    slug: 'chifles-clasicos-100-gr-p1',
    imagen: '',
    ...overrides,
  };
}

describe('ListarCatalogo', () => {
  let fixture: ComponentFixture<ListarCatalogo>;
  let page: ListarCatalogoApi;
  let service: CatalogoService;
  let httpMock: HttpTestingController;

  function crear(): void {
    fixture = TestBed.createComponent(ListarCatalogo);
    page = fixture.componentInstance as unknown as ListarCatalogoApi;
    fixture.detectChanges();
  }

  function texto(): string {
    return fixture.nativeElement.textContent as string;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('carga', () => {
    it('asks the API for the catalog when it opens and shows a loading state', () => {
      crear();

      expect(page.cargando()).toBe(true);
      expect(texto()).toContain('Cargando catálogo');

      flushCatalogo(httpMock);
      fixture.detectChanges();

      expect(page.cargando()).toBe(false);
      expect(texto()).not.toContain('Cargando catálogo');
    });

    it('shows the empty message when there are no products', () => {
      crear();
      flushCatalogo(httpMock, []);
      fixture.detectChanges();

      expect(page.hayProductos()).toBe(false);
      expect(texto()).toContain('Sin productos registrados');
    });

    it('shows an error with a retry action when the catalog cannot be loaded', () => {
      crear();
      httpMock
        .expectOne((r) => r.url === API.productoPresentaciones)
        .flush({ message: 'boom' }, { status: 500, statusText: 'Error' });
      httpMock.match(() => true);
      fixture.detectChanges();

      expect(page.errorCarga()).toBe(true);
      expect(texto()).toContain('No se pudo cargar el catálogo de productos.');

      const reintentar = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b) => b.textContent?.includes('Reintentar'));
      reintentar?.click();
      flushCatalogo(httpMock);
      fixture.detectChanges();

      expect(page.errorCarga()).toBe(false);
      expect(page.filasFiltradas()).toHaveLength(9);
    });
  });

  describe('con el catálogo cargado', () => {
    beforeEach(() => {
      crear();
      flushCatalogo(httpMock);
      fixture.detectChanges();
    });

    it('lists every presentation in the cards view', () => {
      expect(page.vista()).toBe('tarjetas');
      expect(page.pageSize()).toBe(12);
      expect(page.filasFiltradas()).toHaveLength(9);
      expect(page.filasPagina()).toHaveLength(9);
      expect(page.pageCount()).toBe(1);
    });

    it('shows the product image when it has one and a placeholder otherwise', () => {
      const imagenes = Array.from<HTMLImageElement>(fixture.nativeElement.querySelectorAll('img'));

      expect(imagenes).toHaveLength(1);
      expect(imagenes[0].getAttribute('src')).toBe('https://cdn.test/chifles-100.jpg');
      expect(imagenes[0].alt).toBe('Imagen de Chifles clásicos 100 gr');
    });

    it('paginates five rows per page in the table view and goes back to page one', () => {
      page.page.set(1);
      page.setVista('tabla');

      expect(page.pageSize()).toBe(5);
      expect(page.pageCount()).toBe(2);
      expect(page.filasPagina()).toHaveLength(5);

      page.page.set(2);
      expect(page.filasPagina()).toHaveLength(4);

      page.setVista('tarjetas');
      expect(page.page()).toBe(1);
    });

    it('clamps the current page to the last available page', () => {
      page.setVista('tabla');
      page.page.set(99);

      expect(page.paginaActual()).toBe(2);
    });

    it('filters by product name ignoring case', () => {
      page.setQuery('CHIFLES');

      expect(page.filasFiltradas().map((f) => f.sku)).toEqual([
        'FR-P1-PR1',
        'FR-P1-PR2',
        'FR-P2-PR1',
      ]);
    });

    it('filters by category', () => {
      page.setCategoria('Camote');

      expect(page.filasFiltradas()).toHaveLength(2);
    });

    it('filters by presentation', () => {
      page.setPresentacion('1 kg');

      expect(page.filasFiltradas().map((f) => f.sku)).toEqual(['FR-P5-PR5']);
    });

    it('filters by state', () => {
      page.setEstado('Inactivo');

      expect(page.filasFiltradas().map((f) => f.sku)).toEqual(['FR-P7-PR4']);
    });

    it('filters by availability', () => {
      page.setDisp('agotado');
      expect(page.filasFiltradas().map((f) => f.sku)).toEqual(['FR-P7-PR4']);

      page.setDisp('disponible');
      expect(page.filasFiltradas()).toHaveLength(8);
    });

    it('combines filters', () => {
      page.setCategoria('Chifles');
      page.setQuery('picantes');

      expect(page.filasFiltradas()).toHaveLength(1);
    });

    it('returns to page one whenever a filter changes', () => {
      page.setVista('tabla');
      page.page.set(2);

      page.setCategoria('Camote');

      expect(page.page()).toBe(1);
    });

    it('says there are no results when the filters match nothing', () => {
      page.setQuery('zzz');
      fixture.detectChanges();

      expect(texto()).toContain('Sin resultados');
    });

    it('maps availability to badge tone and label', () => {
      const agotado = makeFila({ stock: 0 });
      const bajo = makeFila({ stock: 5, umbral: 10 });
      const disponible = makeFila({ stock: 480 });

      expect(page.dispTone(agotado)).toBe('danger');
      expect(page.dispTone(bajo)).toBe('warning');
      expect(page.dispTone(disponible)).toBe('success');
      expect(page.dispLabel(agotado)).toBe('Agotado');
      expect(page.dispLabel(bajo)).toBe('Stock bajo');
      expect(page.dispLabel(disponible)).toBe('Disponible');
    });

    it('describes the stock of each availability level', () => {
      expect(page.dispTexto(makeFila({ stock: 0 }))).toBe('Agotado');
      expect(page.dispTexto(makeFila({ stock: 5, umbral: 10 }))).toBe(
        '5 unid · bajo el umbral mayorista',
      );
      expect(page.dispTexto(makeFila({ stock: 12, umbral: 10 }))).toBe('12 unid disponibles');
    });

    it('maps the state to its badge tone', () => {
      expect(page.estadoTone('Activo')).toBe('success');
      expect(page.estadoTone('Inactivo')).toBe('neutral');
    });

    it('opens the form to register a product', () => {
      page.nuevoProducto();

      expect(page.formModo()).toBe('nuevo');
      expect(page.productoEnEdicion()).toBeNull();
    });

    it('opens the form to edit the product of the selected row and closes the detail', () => {
      page.verProducto(makeFila());
      page.editarProducto(makeFila({ productoId: 2, presentacionId: 1, sku: 'FR-P2-PR1' }));

      expect(page.formModo()).toBe('editar');
      expect(page.productoEnEdicion()?.nombre).toBe('Chifles picantes');
      expect(page.filaDetalle()).toBeNull();
    });

    it('closes the form', () => {
      page.nuevoProducto();

      page.cerrarForm();

      expect(page.formModo()).toBeNull();
      expect(page.productoEnEdicion()).toBeNull();
    });

    it('shows and dismisses the notice returned by the form', () => {
      page.mostrarAviso({ mensaje: 'Producto registrado', tono: 'ok' });
      expect(page.aviso()).toEqual({ mensaje: 'Producto registrado', tono: 'ok' });

      page.cerrarAviso();
      expect(page.aviso().mensaje).toBe('');
    });

    it('resolves the detail by SKU so it reflects later changes', () => {
      page.verProducto(makeFila());
      expect(page.filaDetalle()?.estado).toBe('Activo');

      service.alternarEstadoPresentacion(1, 1).subscribe();
      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush({});
      const filas = catalogoDto();
      filas[0] = { ...filas[0], estado: false };
      flushCatalogo(httpMock, filas);

      expect(page.filaDetalle()?.estado).toBe('Inactivo');
    });

    it('toggles a presentation, reloads and shows the notice', () => {
      page.alternarEstado(makeFila());

      const req = httpMock.expectOne(`${API.productoPresentaciones}/11`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      const filas = catalogoDto();
      filas[0] = { ...filas[0], estado: false };
      flushCatalogo(httpMock, filas);

      expect(page.aviso()).toEqual({
        mensaje: 'Presentación FR-P1-PR1 desactivada de forma lógica.',
        tono: 'ok',
      });
      expect(page.filasFiltradas().find((f) => f.sku === 'FR-P1-PR1')?.estado).toBe('Inactivo');
    });

    it('shows the API reason as an error notice when the change is rejected', () => {
      page.alternarEstado(makeFila());

      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush(
        {
          statusCode: 409,
          message: 'No se puede desactivar la presentación: todavía tiene stock disponible',
        },
        { status: 409, statusText: 'Conflict' },
      );

      expect(page.aviso()).toEqual({
        mensaje: 'No se puede desactivar la presentación: todavía tiene stock disponible',
        tono: 'error',
      });
      expect(page.filasFiltradas().find((f) => f.sku === 'FR-P1-PR1')?.estado).toBe('Activo');
    });
  });
});
