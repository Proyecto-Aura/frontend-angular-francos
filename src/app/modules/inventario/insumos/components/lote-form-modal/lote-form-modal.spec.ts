import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { LoteInsumoDto } from '../../interfaces/lote-insumo-dto.interface';
import { LoteFormModal } from './lote-form-modal';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;
const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;

// YYYY-MM-DD en hora local — el secuencial se reinicia por dia (ver
// siguienteSecuencialLote en el mapper), asi que los fixtures de lotes
// "existentes" tienen que llevar la fecha_ingreso de HOY de verdad para
// seguir contando en el calculo del proximo secuencial.
function hoyIsoLocal(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 9,
    sku: 'FR-INS-9',
    nombre: 'Harina de trigo',
    descripcion: null,
    unidad_medida: 'kg',
    stock_actual: 250,
    stock_minimo: 50,
    stock_maximo: 400,
    tipo: 'materia_prima',
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLoteDto(overrides: Partial<LoteInsumoDto> = {}): LoteInsumoDto {
  return {
    id: 1,
    insumo_id: 9,
    codigo_lote: 'FR-LT-006-261017-INS9',
    fecha_ingreso: '2026-10-17',
    fecha_vencimiento: '2026-12-01',
    cantidad_inicial: 250,
    cantidad_actual: 250,
    estado: 'activo',
    activo: true,
    created_at: '2026-10-17T00:00:00.000Z',
    updated_at: '2026-10-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('LoteFormModal', () => {
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
      .expectOne((request) => request.url === INSUMOS_BASE)
      .flush({
        data: [makeInsumoDto()],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();

    return fixture;
  }

  // codigosExistentes simula los codigo_lote que ya tiene ese insumo — el
  // siguiente secuencial sale del maximo de esos codigos, no de cuantos son
  // (ver siguienteSecuencialLote en el mapper).
  function seleccionarInsumoYResolverSecuencial(
    fixture: ComponentFixture<LoteFormModal>,
    codigosExistentes: string[],
  ): void {
    fixture.componentInstance.seleccionarInsumo('9');
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === LOTES_BASE && request.params.get('insumo_id') === '9')
      .flush({
        data: codigosExistentes.map((codigo_lote) =>
          makeLoteDto({ codigo_lote, fecha_ingreso: hoyIsoLocal() }),
        ),
        meta: {
          total: codigosExistentes.length,
          page: 1,
          limit: 100,
          total_pages: 1,
        },
      });
    fixture.detectChanges();
  }

  it('loads active insumos into the select when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.insumosOptions()).toEqual([
      { value: '9', label: 'FR-INS-9 · Harina de trigo' },
    ]);
  });

  it('resets the form fields when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.insumoId()).toBe('');
    expect(fixture.componentInstance.codigoLote()).toBe('');
    expect(fixture.componentInstance.errores()).toEqual({});
  });

  it('builds the codigo_lote from the max existing sequence when an insumo is selected', () => {
    const fixture = openModal();

    seleccionarInsumoYResolverSecuencial(fixture, [
      'FR-LT-004-260101-INS9',
      'FR-LT-005-260102-INS9',
    ]);

    expect(fixture.componentInstance.codigoLote()).toMatch(/^FR-LT-006-\d{6}-INS9$/);
  });

  it('skips a gap from a lote deleted outside the app instead of colliding with the surviving codigo_lote', () => {
    const fixture = openModal();

    // Caso real: solo queda el lote "002" (el 001 se borro fuera de la
    // app). El proximo tiene que ser 003, nunca repetir el 002.
    seleccionarInsumoYResolverSecuencial(fixture, ['FR-LT-002-261017-INS9']);

    expect(fixture.componentInstance.codigoLote()).toMatch(/^FR-LT-003-\d{6}-INS9$/);
  });

  it('shows the unidad_medida of the selected insumo in a disabled field, once chosen', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.unidadInsumo()).toBe('');

    seleccionarInsumoYResolverSecuencial(fixture, []);

    expect(fixture.componentInstance.unidadInsumo()).toBe('kg');
  });

  function openModalConInsumoEmpaque(): ComponentFixture<LoteFormModal> {
    const fixture = TestBed.createComponent(LoteFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === INSUMOS_BASE)
      .flush({
        data: [makeInsumoDto({ tipo: 'empaque' })],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();

    return fixture;
  }

  it('does not require fechaVencimiento for an insumo tipo empaque', () => {
    const fixture = openModalConInsumoEmpaque();

    seleccionarInsumoYResolverSecuencial(fixture, []);

    expect(fixture.componentInstance.requiereFechaVencimiento()).toBe(false);
  });

  it('clears a previously typed fechaVencimiento when switching to an insumo tipo empaque', () => {
    const fixture = TestBed.createComponent(LoteFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    httpMock
      .expectOne((request) => request.url === INSUMOS_BASE)
      .flush({
        data: [
          makeInsumoDto({ id: 9, tipo: 'materia_prima' }),
          makeInsumoDto({ id: 10, sku: 'FR-INS-10', tipo: 'empaque' }),
        ],
        meta: { total: 2, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();

    fixture.componentInstance.seleccionarInsumo('9');
    httpMock
      .expectOne((request) => request.url === LOTES_BASE && request.params.get('insumo_id') === '9')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 1 } });
    fixture.detectChanges();
    fixture.componentInstance.fechaVencimiento.set('2026-12-01');

    fixture.componentInstance.seleccionarInsumo('10');
    httpMock
      .expectOne(
        (request) => request.url === LOTES_BASE && request.params.get('insumo_id') === '10',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 1 } });
    fixture.detectChanges();

    expect(fixture.componentInstance.fechaVencimiento()).toBe('');
  });

  it('registers a lote without fechaVencimiento for an insumo tipo empaque', () => {
    const fixture = openModalConInsumoEmpaque();
    seleccionarInsumoYResolverSecuencial(fixture, []);
    fixture.componentInstance.cantidadInicial.set('60');

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(LOTES_BASE);
    expect(req.request.body).not.toHaveProperty('fecha_vencimiento');
    req.flush(makeLoteDto({ fecha_vencimiento: null }));
  });

  it('does not POST an empty form and marks its required fields', () => {
    const fixture = openModal();

    fixture.componentInstance.guardar();

    httpMock.expectNone(LOTES_BASE);
    expect(fixture.componentInstance.errores()).toMatchObject({
      insumoId: 'Selecciona un insumo.',
      fechaVencimiento: 'Requerido.',
      cantidadInicial: 'Requerido.',
    });
  });

  it('registers a valid lote and emits saved and closed', () => {
    const fixture = openModal();
    seleccionarInsumoYResolverSecuencial(fixture, []);
    fixture.componentInstance.fechaVencimiento.set('2026-12-01');
    fixture.componentInstance.cantidadInicial.set('250');
    const saved: unknown[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((lote) => saved.push(lote));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(LOTES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      insumo_id: 9,
      codigo_lote: fixture.componentInstance.codigoLote(),
      fecha_vencimiento: '2026-12-01',
      cantidad_inicial: 250,
    });
    req.flush(makeLoteDto());

    expect(saved).toEqual([
      expect.objectContaining({ id: 1, codigoLote: 'FR-LT-006-261017-INS9' }),
    ]);
    expect(closed).toBe(1);
  });

  it('rejects a fecha_vencimiento earlier than fecha_ingreso before calling the backend', () => {
    const fixture = openModal();
    seleccionarInsumoYResolverSecuencial(fixture, []);
    fixture.componentInstance.cantidadInicial.set('100');
    fixture.componentInstance.fechaVencimiento.set('2000-01-01');

    fixture.componentInstance.guardar();

    httpMock.expectNone(LOTES_BASE);
    expect(fixture.componentInstance.errores().fechaVencimiento).toBe(
      'Debe ser igual o posterior a la fecha de ingreso.',
    );
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = openModal();
    seleccionarInsumoYResolverSecuencial(fixture, []);
    fixture.componentInstance.fechaVencimiento.set('2026-12-01');
    fixture.componentInstance.cantidadInicial.set('100');

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(LOTES_BASE)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para registrar lotes.',
    );
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = openModal();
    seleccionarInsumoYResolverSecuencial(fixture, []);
    fixture.componentInstance.fechaVencimiento.set('2026-12-01');
    fixture.componentInstance.cantidadInicial.set('100');

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(LOTES_BASE)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo registrar el lote. Intente nuevamente.',
    );
  });
});
