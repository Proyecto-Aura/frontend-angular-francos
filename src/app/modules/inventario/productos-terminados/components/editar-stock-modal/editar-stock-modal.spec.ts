import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import { EditarStockModal } from './editar-stock-modal';

const PRODUCTOS_TERMINADOS_BASE = `${environment.apiUrl}/productos-terminados`;

function makeProducto(overrides: Partial<ProductoPresentacion> = {}): ProductoPresentacion {
  return {
    id: 7,
    productoTerminadoId: 25,
    sku: 'FR-P3-PR2',
    productoNombre: 'Pan de molde',
    productoDescripcion: 'Pan de molde integral, bolsa sellada.',
    categoriaId: 2,
    categoriaNombre: 'Panadería',
    presentacionId: 2,
    presentacionCantidad: 500,
    presentacionUnidadMedida: 'gr',
    estado: true,
    stockActual: 45,
    stockMinimo: 10,
    stockMaximo: 300,
    ...overrides,
  };
}

describe('EditarStockModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(producto: ProductoPresentacion | null): ComponentFixture<EditarStockModal> {
    const fixture = TestBed.createComponent(EditarStockModal);
    fixture.componentRef.setInput('producto', producto);
    fixture.detectChanges();
    return fixture;
  }

  it('starts closed with no producto', () => {
    const fixture = create(null);
    expect(fixture.componentInstance.producto()).toBeNull();
  });

  it('prefills stockMinimo/stockMaximo con los valores actuales del producto', () => {
    const fixture = create(makeProducto({ stockMinimo: 10, stockMaximo: 300 }));

    expect(fixture.componentInstance.stockMinimo()).toBe('10');
    expect(fixture.componentInstance.stockMaximo()).toBe('300');
  });

  it('prefills stockMaximo vacío cuando el producto no tiene tope definido', () => {
    const fixture = create(makeProducto({ stockMaximo: null }));

    expect(fixture.componentInstance.stockMaximo()).toBe('');
  });

  it('does not call the backend and marks the error when stockMaximo es menor que stockMinimo', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;
    component.stockMinimo.set('50');
    component.stockMaximo.set('10');

    component.guardar();

    httpMock.expectNone(`${PRODUCTOS_TERMINADOS_BASE}/7`);
    expect(component.errores().stockMaximo).toBe('Debe ser mayor o igual al stock mínimo.');
  });

  it('does not call the backend and marks required fields when alguno queda vacío', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;
    component.stockMinimo.set('');

    component.guardar();

    httpMock.expectNone(`${PRODUCTOS_TERMINADOS_BASE}/7`);
    expect(component.errores()).toEqual({ stockMinimo: 'Requerido.' });
  });

  it('patches ambos campos juntos y emits saved/closed on success, ignorando el shape plano de la respuesta', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;
    let guardados = 0;
    let closed = 0;
    component.saved.subscribe(() => guardados++);
    component.closed.subscribe(() => closed++);

    component.stockMinimo.set('15');

    component.guardar();
    expect(component.guardando()).toBe(true);

    const req = httpMock.expectOne(`${PRODUCTOS_TERMINADOS_BASE}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stock_minimo: 15, stock_maximo: 300 });
    // El PATCH responde con un shape plano distinto al de GET /producto-presentaciones
    // (sin producto/presentacion anidados, "id" distinto al producto_presentacion_id) —
    // confirmado por el backend. Este fixture reproduce exactamente ese shape real para
    // evitar que el bug (TypeError al mapear como si fuera anidado) vuelva a pasar.
    req.flush({
      id: 25,
      producto_presentacion_id: 7,
      sku: 'FR-P3-PR2',
      producto_id: 3,
      producto_nombre: 'Pan de molde',
      categoria_id: 2,
      categoria_nombre: 'Panadería',
      presentacion_id: 2,
      presentacion_cantidad: 500,
      presentacion_unidad_medida: 'gr',
      stock_actual: 45,
      stock_minimo: 15,
      stock_maximo: 300,
      created_at: '2026-10-25T19:33:31.240Z',
      updated_at: '2026-10-25T21:40:55.011Z',
    });

    expect(component.guardando()).toBe(false);
    expect(guardados).toBe(1);
    expect(closed).toBe(1);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;

    component.guardar();
    httpMock
      .expectOne(`${PRODUCTOS_TERMINADOS_BASE}/7`)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.errorGeneral()).toBe('No tiene permisos para editar el stock.');
  });

  it('shows the backend message for a 409 (stock_maximo menor que stock_minimo del lado del servidor)', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;

    component.guardar();
    httpMock
      .expectOne(`${PRODUCTOS_TERMINADOS_BASE}/7`)
      .flush(
        { statusCode: 409, message: 'stock_maximo no puede ser menor que stock_minimo' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(component.errorGeneral()).toBe('stock_maximo no puede ser menor que stock_minimo');
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;

    component.guardar();
    httpMock
      .expectOne(`${PRODUCTOS_TERMINADOS_BASE}/7`)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(component.errorGeneral()).toBe('No se pudo actualizar el stock. Intente nuevamente.');
  });
});
