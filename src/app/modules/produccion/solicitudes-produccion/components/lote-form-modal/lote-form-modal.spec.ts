import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { LoteProductoTerminadoDto } from '../../interfaces/lote-producto-terminado-dto.interface';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { LoteFormModal } from './lote-form-modal';

const PRODUCTOS_BASE = `${environment.apiUrl}/producto-presentaciones`;
const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;

function hoyIsoLocal(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function makeProductoDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 100,
    sku: 'FR-P3-PR2',
    estado: true,
    producto: { id: 3, nombre: 'Camote frito' },
    presentacion: { id: 2, cantidad: 500, unidad_medida: 'gr' },
    producto_terminado: { id: 12 },
    ...overrides,
  };
}

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 12,
    sku: 'FR-P3-PR2',
    producto_nombre: 'Camote frito',
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LT-006-261017-P3-PR2',
    fecha_produccion: '2026-10-17',
    fecha_vencimiento: '2026-12-01',
    cantidad_inicial: 50,
    cantidad_actual: 50,
    estado: 'activo',
    activo: true,
    ...overrides,
  };
}

describe('LoteFormModal (Produccion)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function openModal(): ComponentFixture<LoteFormModal> {
    const fixture = TestBed.createComponent(LoteFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === PRODUCTOS_BASE)
      .flush({
        data: [makeProductoDto()],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();

    return fixture;
  }

  function seleccionarProductoYResolverSecuencial(
    fixture: ComponentFixture<LoteFormModal>,
    codigosExistentes: string[],
  ): void {
    fixture.componentInstance.seleccionarProducto('12');
    fixture.detectChanges();

    httpMock
      .expectOne(
        (request) =>
          request.url === LOTES_BASE && request.params.get('producto_terminado_id') === '12',
      )
      .flush({
        data: codigosExistentes.map((codigo_lote) =>
          makeLoteDto({ codigo_lote, fecha_produccion: hoyIsoLocal() }),
        ),
        meta: { total: codigosExistentes.length, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();
  }

  it('loads active products into the select when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.productosOptions()).toEqual([
      { value: '12', label: 'FR-P3-PR2 · Camote frito · 500 gr' },
    ]);
  });

  it('resets the form fields when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.productoTerminadoId()).toBe('');
    expect(fixture.componentInstance.codigoLote()).toBe('');
    expect(fixture.componentInstance.errores()).toEqual({});
  });

  it('builds the codigo_lote from the max existing sequence when a producto is selected', () => {
    const fixture = openModal();

    seleccionarProductoYResolverSecuencial(fixture, [
      'FR-LT-004-260101-P3-PR2',
      'FR-LT-005-260102-P3-PR2',
    ]);

    expect(fixture.componentInstance.codigoLote()).toMatch(/^FR-LT-006-\d{6}-P3-PR2$/);
  });

  it('shows the presentacion of the selected producto in a disabled field', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.presentacionProducto()).toBe('');

    seleccionarProductoYResolverSecuencial(fixture, []);

    expect(fixture.componentInstance.presentacionProducto()).toBe('500 gr');
  });

  it('does not POST an empty form and marks its required fields', () => {
    const fixture = openModal();

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errores()).toEqual({
      productoTerminadoId: 'Selecciona un producto.',
      cantidadInicial: 'Requerido.',
    });
    httpMock.expectNone(LOTES_BASE);
  });

  it('registers a lote sin fecha_vencimiento cuando no se cargo', () => {
    const fixture = openModal();
    seleccionarProductoYResolverSecuencial(fixture, []);
    fixture.componentInstance.cantidadInicial.set('50');

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(LOTES_BASE);
    expect(req.request.body).toEqual({
      producto_terminado_id: 12,
      codigo_lote: fixture.componentInstance.codigoLote(),
      fecha_produccion: hoyIsoLocal(),
      cantidad_inicial: 50,
    });
    req.flush(makeLoteDto({ fecha_vencimiento: null }));
  });

  it('registers a lote con fecha_vencimiento cuando se cargo, y emite saved', () => {
    const fixture = openModal();
    seleccionarProductoYResolverSecuencial(fixture, []);
    fixture.componentInstance.cantidadInicial.set('50');
    fixture.componentInstance.fechaVencimiento.set('2026-12-01');

    let guardado: unknown;
    fixture.componentInstance.saved.subscribe((lote) => (guardado = lote));
    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(LOTES_BASE);
    expect(req.request.body).toMatchObject({ fecha_vencimiento: '2026-12-01' });
    req.flush(makeLoteDto());

    expect(guardado).toBeTruthy();
    expect(cerrado).toBe(true);
  });

  it('shows a permission error message on 403', () => {
    const fixture = openModal();
    seleccionarProductoYResolverSecuencial(fixture, []);
    fixture.componentInstance.cantidadInicial.set('50');

    fixture.componentInstance.guardar();

    httpMock.expectOne(LOTES_BASE).flush('forbidden', { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para registrar lotes.',
    );
  });

  it('regenerates the codigo on a 409 duplicate error', () => {
    const fixture = openModal();
    seleccionarProductoYResolverSecuencial(fixture, []);
    fixture.componentInstance.cantidadInicial.set('50');

    fixture.componentInstance.guardar();

    httpMock
      .expectOne(LOTES_BASE)
      .flush({ message: 'codigo_lote ya existe' }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorGeneral()).toContain('Generando uno nuevo');
    httpMock
      .expectOne(
        (request) =>
          request.url === LOTES_BASE && request.params.get('producto_terminado_id') === '12',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 1 } });
  });

  it('emits closed on cerrar()', () => {
    const fixture = openModal();

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(true);
  });
});
