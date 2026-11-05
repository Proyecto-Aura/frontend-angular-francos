import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { SolicitudInsumoDto } from '../../interfaces/solicitud-insumo-dto.interface';
import { construirCodigoSolicitudInsumo } from '../../mappers/solicitud-insumo.mapper';
import { SolicitudInsumoFormModal } from './solicitud-insumo-form-modal';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;
const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;
const SOLICITUDES_PRODUCCION_BASE = `${environment.apiUrl}/produccion/solicitudes`;
const CODIGO_001_DE_HOY = construirCodigoSolicitudInsumo(1);

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 12,
    sku: 'FR-INS-012',
    nombre: 'Harina de trigo',
    unidad_medida: 'kg',
    stock_actual: 45,
    stock_minimo: 10,
    ...overrides,
  };
}

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-091-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04',
    fecha_limite: '2026-11-15',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'Admin Sistema',
    created_at: '2026-11-04T00:00:00.000Z',
    updated_at: '2026-11-04T00:00:00.000Z',
    detalle: [],
    ...overrides,
  };
}

describe('SolicitudInsumoFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function openModal(
    insumos: InsumoDto[] = [makeInsumoDto()],
    solicitudesProduccion: { id: number; codigo: string; estado: string }[] = [],
  ): ComponentFixture<SolicitudInsumoFormModal> {
    const fixture = TestBed.createComponent(SolicitudInsumoFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === INSUMOS_BASE)
      .flush({
        data: insumos,
        meta: { total: insumos.length, page: 1, limit: 100, total_pages: 1 },
      });
    httpMock
      .expectOne(
        (request) =>
          request.url === SOLICITUDES_PRODUCCION_BASE &&
          request.params.get('estado') === 'en_proceso',
      )
      .flush({
        data: solicitudesProduccion,
        meta: { total: solicitudesProduccion.length, page: 1, limit: 100, total_pages: 1 },
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

  it('loads insumos into the combobox options', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.insumosOptions()).toEqual([
      { value: '12', label: 'Harina de trigo', secondary: 'FR-INS-012' },
    ]);
  });

  it('loads solicitudes de produccion en_proceso into the combobox options', () => {
    const fixture = openModal(
      [makeInsumoDto()],
      [{ id: 6, codigo: 'FR-SPR-001-261104', estado: 'en_proceso' }],
    );

    expect(fixture.componentInstance.solicitudesProduccionOptions()).toEqual([
      { value: '6', label: 'FR-SPR-001-261104' },
    ]);
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
    expect(component.filas()).toEqual([{ id: 1, insumoId: '', cantidadSolicitada: '0' }]);
    expect(component.errores()).toEqual({});
  });

  it('adds and removes filas, showing the quitar button only when there is more than one', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.agregarFila();
    expect(component.filas()).toEqual([
      { id: 1, insumoId: '', cantidadSolicitada: '0' },
      { id: 2, insumoId: '', cantidadSolicitada: '0' },
    ]);

    component.quitarFila(1);
    expect(component.filas()).toEqual([{ id: 2, insumoId: '', cantidadSolicitada: '0' }]);
  });

  it('shows stock actual/stock minimo once an insumo is selected on that fila', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const fila = component.filas()[0];

    expect(component.stockActualDeFila(fila)).toBe('—');
    expect(component.stockMinimoDeFila(fila)).toBe('—');

    component.seleccionarInsumoDeFila(1, '12');
    const filaConInsumo = component.filas()[0];

    expect(component.stockActualDeFila(filaConInsumo)).toBe('45');
    expect(component.stockMinimoDeFila(filaConInsumo)).toBe('10');
    expect(component.unidadMedidaDeFila(filaConInsumo)).toBe('kg');
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
      porFila: { 1: { insumoId: 'Selecciona un insumo.' } },
    });
  });

  it('posts la solicitud con el codigo preview y el detalle mapeado a insumo_id, then emits saved/closed', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[] = [];
    let closed = 0;
    component.saved.subscribe((v) => guardados.push(v));
    component.closed.subscribe(() => closed++);

    component.fechaLimite.set('2026-11-15');
    component.seleccionarInsumoDeFila(1, '12');
    component.actualizarCantidadDeFila(1, '50');

    component.guardar();
    expect(component.guardando()).toBe(true);

    const req = httpMock.expectOne(SOLICITUDES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codigo_solicitud: CODIGO_001_DE_HOY,
      fecha_limite: '2026-11-15',
      detalle: [{ insumo_id: 12, cantidad_solicitada: 50 }],
    });
    req.flush(makeSolicitudDto());

    expect(component.guardando()).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ codigo: 'FR-SIN-091-261104' });
    expect(closed).toBe(1);
  });

  it('posts incluyendo solicitud_produccion_id cuando se elige una solicitud de produccion', () => {
    const fixture = openModal(
      [makeInsumoDto()],
      [{ id: 6, codigo: 'FR-SPR-001-261104', estado: 'en_proceso' }],
    );
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-11-15');
    component.seleccionarInsumoDeFila(1, '12');
    component.actualizarCantidadDeFila(1, '50');
    component.seleccionarSolicitudProduccion('6');

    component.guardar();

    const req = httpMock.expectOne(SOLICITUDES_BASE);
    expect(req.request.body).toMatchObject({ solicitud_produccion_id: 6 });
    req.flush(makeSolicitudDto({ solicitud_produccion_id: 6 }));
  });

  it('rejects repeating the same insumo across filas before posting', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-11-15');
    component.seleccionarInsumoDeFila(1, '12');
    component.actualizarCantidadDeFila(1, '10');
    component.agregarFila();
    component.seleccionarInsumoDeFila(2, '12');
    component.actualizarCantidadDeFila(2, '5');

    component.guardar();

    httpMock.expectNone(SOLICITUDES_BASE);
    expect(component.errores().filas).toBe('No puedes repetir el mismo insumo en dos filas.');
  });

  it('regenerates the codigo and shows a message on a 409 duplicado', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.fechaLimite.set('2026-11-15');
    component.seleccionarInsumoDeFila(1, '12');
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();
    httpMock
      .expectOne(SOLICITUDES_BASE)
      .flush(
        { statusCode: 409, message: 'codigo_solicitud ya existe' },
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

    component.fechaLimite.set('2026-11-15');
    component.seleccionarInsumoDeFila(1, '12');
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

    component.fechaLimite.set('2026-11-15');
    component.seleccionarInsumoDeFila(1, '12');
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
