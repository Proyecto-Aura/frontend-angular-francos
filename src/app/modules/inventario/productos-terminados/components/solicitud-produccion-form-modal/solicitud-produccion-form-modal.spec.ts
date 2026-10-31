import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { SolicitudProduccionDto } from '../../interfaces/solicitud-produccion-dto.interface';
import { construirCodigoSolicitud } from '../../mappers/solicitud-produccion.mapper';
import { SolicitudProduccionFormModal } from './solicitud-produccion-form-modal';

const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;
const SOLICITUDES_BASE = `${environment.apiUrl}/solicitudes-produccion`;
// El preview real usa new Date() (hoy), asi que los tests tienen que
// calcular el codigo esperado igual, no un string pelado — mismo criterio
// que hoyIsoLocal() en otros specs del modulo.
const CODIGO_001_DE_HOY = construirCodigoSolicitud(1);

function makeProductoDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 7,
    sku: 'FR-P3-PR2',
    estado: true,
    producto_id: 3,
    presentacion_id: 2,
    producto: {
      id: 3,
      nombre: 'Camote frito',
      descripcion: null,
      categoria: { id: 2, nombre: 'Snacks' },
    },
    presentacion: { id: 2, cantidad: 500, unidad_medida: 'gr' },
    producto_terminado: { id: 256, stock_actual: 45, stock_minimo: 10, stock_maximo: 300 },
    ...overrides,
  };
}

function makeSolicitudDto(overrides: Partial<SolicitudProduccionDto> = {}): SolicitudProduccionDto {
  return {
    id: 10,
    codigo: 'FR-SPR-091-260912',
    estado: 'pendiente',
    fecha_creacion: '2026-09-12',
    fecha_limite: '2026-09-15',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-09-12T00:00:00.000Z',
    updated_at: '2026-09-12T00:00:00.000Z',
    detalle: [],
    ...overrides,
  };
}

describe('SolicitudProduccionFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function openModal(
    productos: ProductoPresentacionDto[] = [makeProductoDto()],
  ): ComponentFixture<SolicitudProduccionFormModal> {
    const fixture = TestBed.createComponent(SolicitudProduccionFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === PRODUCTO_PRESENTACIONES_BASE)
      .flush({
        data: productos,
        meta: { total: productos.length, page: 1, limit: 100, total_pages: 1 },
      });
    httpMock
      .expectOne(
        (request) =>
          request.url === SOLICITUDES_BASE &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '100',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
    fixture.detectChanges();

    return fixture;
  }

  it('loads productos con productoTerminadoId resuelto into the combobox options', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.productosOptions()).toEqual([
      { value: '256', label: 'Camote frito', secondary: 'FR-P3-PR2' },
    ]);
  });

  it('filters out productos sin productoTerminadoId resuelto (caso rarisimo)', () => {
    const fixture = openModal([
      makeProductoDto({ id: 8, sku: 'FR-P3-PR3', producto_terminado: null }),
    ]);

    expect(fixture.componentInstance.productosOptions()).toEqual([]);
  });

  it('fetches and shows the next codigo preview when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.codigoPreview()).toBe(CODIGO_001_DE_HOY);
    expect(fixture.componentInstance.generandoCodigo()).toBe(false);
  });

  it('resets the form with one empty fila and no errors when opened', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    expect(component.fechaLimite()).toBe('');
    expect(component.filas()).toEqual([
      { id: 1, productoTerminadoId: '', cantidadSolicitada: '0' },
    ]);
    expect(component.errores()).toEqual({});
  });

  it('adds and removes filas, showing the quitar button only when there is more than one', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.agregarFila();
    expect(component.filas()).toEqual([
      { id: 1, productoTerminadoId: '', cantidadSolicitada: '0' },
      { id: 2, productoTerminadoId: '', cantidadSolicitada: '0' },
    ]);

    component.quitarFila(1);
    expect(component.filas()).toEqual([
      { id: 2, productoTerminadoId: '', cantidadSolicitada: '0' },
    ]);
  });

  it('shows presentacion/stock actual/stock minimo once a producto is selected on that fila', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const fila = component.filas()[0];

    expect(component.presentacionDeFila(fila)).toBe('—');
    expect(component.stockActualDeFila(fila)).toBe('—');
    expect(component.stockMinimoDeFila(fila)).toBe('—');

    component.seleccionarProductoDeFila(1, '256');
    const filaConProducto = component.filas()[0];

    expect(component.presentacionDeFila(filaConProducto)).toBe('500 gr');
    expect(component.stockActualDeFila(filaConProducto)).toBe('45');
    expect(component.stockMinimoDeFila(filaConProducto)).toBe('10');
  });

  it('does not call the backend and marks required fields for an empty form', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[] = [];
    let closed = 0;
    component.saved.subscribe((v) => guardados.push(v));
    component.closed.subscribe(() => closed++);

    component.guardar();

    httpMock.expectNone(SOLICITUDES_BASE);
    expect(guardados).toEqual([]);
    expect(closed).toBe(0);
    expect(component.errores()).toMatchObject({
      fechaLimite: 'Requerido.',
      porFila: { 1: { productoTerminadoId: 'Selecciona un producto.' } },
    });
  });

  it('posts the solicitud with the codigo preview y el detalle mapeado a producto_terminado_id, then emits saved/closed', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[] = [];
    let closed = 0;
    component.saved.subscribe((v) => guardados.push(v));
    component.closed.subscribe(() => closed++);

    component.fechaLimite.set('2026-09-15');
    component.seleccionarProductoDeFila(1, '256');
    component.actualizarCantidadDeFila(1, '20');

    component.guardar();
    expect(component.guardando()).toBe(true);

    const req = httpMock.expectOne(SOLICITUDES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codigo: CODIGO_001_DE_HOY,
      fecha_limite: '2026-09-15',
      detalle: [{ producto_terminado_id: 256, cantidad_solicitada: 20 }],
    });
    req.flush(makeSolicitudDto());

    expect(component.guardando()).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ codigo: 'FR-SPR-091-260912' });
    expect(closed).toBe(1);
  });

  it('emits saved/closed aunque la respuesta del POST no traiga "detalle" (bug real: el presenter de alta solo devuelve la cabecera, a diferencia del GET)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[] = [];
    let closed = 0;
    component.saved.subscribe((v) => guardados.push(v));
    component.closed.subscribe(() => closed++);

    component.fechaLimite.set('2026-09-15');
    component.seleccionarProductoDeFila(1, '256');
    component.actualizarCantidadDeFila(1, '20');

    component.guardar();
    const req = httpMock.expectOne(SOLICITUDES_BASE);
    // Respuesta real que reprodujo el backend: solo la cabecera, sin
    // "detalle" — antes esto hacia que el mapper tirara y el form mostrara
    // "No se pudo crear la solicitud" aunque el alta hubiera sido exitosa.
    req.flush({
      id: 2,
      codigo: 'FR-SPR-001-261030-TEST',
      estado: 'pendiente',
      fecha_creacion: '2026-10-30T00:00:00.000Z',
      fecha_limite: '2026-11-11T00:00:00.000Z',
      solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
      solicitado_por_nombre: "Admin Sistema Franco's",
      created_at: '2026-10-30T05:38:54.653Z',
      updated_at: '2026-10-30T05:38:54.653Z',
    });

    expect(component.errorGeneral()).toBeNull();
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ codigo: 'FR-SPR-001-261030-TEST', detalle: [] });
    expect(closed).toBe(1);
  });

  it('rejects repeating the same producto across filas before posting', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-09-15');
    component.seleccionarProductoDeFila(1, '256');
    component.actualizarCantidadDeFila(1, '10');
    component.agregarFila();
    component.seleccionarProductoDeFila(2, '256');
    component.actualizarCantidadDeFila(2, '5');

    component.guardar();

    httpMock.expectNone(SOLICITUDES_BASE);
    expect(component.errores().filas).toBe('No puedes repetir el mismo producto en dos filas.');
  });

  it('regenerates the codigo and shows a message on a 409 duplicado', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-09-15');
    component.seleccionarProductoDeFila(1, '256');
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();
    httpMock
      .expectOne(SOLICITUDES_BASE)
      .flush(
        { statusCode: 409, message: 'codigo ya existe' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(component.errorGeneral()).toBe(
      'Ese código de solicitud ya existe. Generando uno nuevo…',
    );
    expect(component.generandoCodigo()).toBe(true);

    httpMock
      .expectOne(
        (request) =>
          request.url === SOLICITUDES_BASE &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '100',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });

    expect(component.codigoPreview()).toBe(CODIGO_001_DE_HOY);
    expect(component.generandoCodigo()).toBe(false);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-09-15');
    component.seleccionarProductoDeFila(1, '256');
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();
    httpMock
      .expectOne(SOLICITUDES_BASE)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.errorGeneral()).toBe('No tiene permisos para crear solicitudes.');
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-09-15');
    component.seleccionarProductoDeFila(1, '256');
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();
    httpMock
      .expectOne(SOLICITUDES_BASE)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(component.errorGeneral()).toBe('No se pudo crear la solicitud. Intente nuevamente.');
  });
});
