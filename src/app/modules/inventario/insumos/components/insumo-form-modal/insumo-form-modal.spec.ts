import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { Insumo } from '../../interfaces/insumo.interface';
import { InsumoFormModal } from './insumo-form-modal';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 9,
    sku: 'FR-INS-9',
    nombre: 'Harina especial',
    descripcion: null,
    unidad_medida: 'kg',
    stock_actual: 0,
    stock_minimo: 10,
    stock_maximo: 100,
    tipo: 'materia_prima',
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('InsumoFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function makeInsumo(overrides: Partial<Insumo> = {}): Insumo {
    return {
      id: 1,
      sku: 'FR-INS-1',
      nombre: 'Harina de trigo',
      descripcion: 'Harina especial para panificación',
      unidadMedida: 'kg',
      stockActual: 250,
      stockMinimo: 50,
      stockMaximo: 400,
      tipo: 'materia_prima',
      estado: true,
      ...overrides,
    };
  }

  function openModal(insumo: Insumo | null = null): ComponentFixture<InsumoFormModal> {
    const fixture = TestBed.createComponent(InsumoFormModal);
    fixture.componentRef.setInput('insumo', insumo);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(fixture: ComponentFixture<InsumoFormModal>): void {
    const component = fixture.componentInstance;
    component.nombre.set('Harina especial');
    component.tipo.set('materia_prima');
    component.unidadMedida.set('kg');
    component.stockMinimo.set('10');
    component.stockMaximo.set('100');
    fixture.detectChanges();
  }

  it('resets the form fields when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.nombre()).toBe('');
    expect(fixture.componentInstance.errores()).toEqual({});
  });

  it('does not POST an empty form and marks its required fields', () => {
    const fixture = openModal();

    fixture.componentInstance.guardar();

    httpMock.expectNone(INSUMOS_BASE);
    expect(fixture.componentInstance.errores()).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      tipo: 'Requerido.',
      unidadMedida: 'Requerido.',
      stockMinimo: 'Requerido.',
      stockMaximo: 'Requerido.',
    });
  });

  it('registers a valid insumo and emits saved and closed', () => {
    const fixture = openModal();
    fillValidForm(fixture);
    const saved: unknown[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((insumo) => saved.push(insumo));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(INSUMOS_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Harina especial',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
    req.flush(makeInsumoDto());

    expect(saved).toEqual([expect.objectContaining({ id: 9, sku: 'FR-INS-9' })]);
    expect(closed).toBe(1);
  });

  it('includes descripcion when filled, and never sends stock_actual (el backend lo rechaza, lo recalcula un trigger)', () => {
    const fixture = openModal();
    fillValidForm(fixture);
    fixture.componentInstance.descripcion.set('Harina 000');

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(INSUMOS_BASE);
    expect(req.request.body).toEqual({
      nombre: 'Harina especial',
      descripcion: 'Harina 000',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
    req.flush(makeInsumoDto());
  });

  it('puts a stock_maximo/stock_minimo conflict on the stockMaximo field', () => {
    const fixture = openModal();
    fillValidForm(fixture);
    const message = 'El stock máximo debe ser mayor o igual que el stock mínimo';

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(INSUMOS_BASE)
      .flush({ statusCode: 409, message }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errores().stockMaximo).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = openModal();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(INSUMOS_BASE)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para registrar insumos.',
    );
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = openModal();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(INSUMOS_BASE)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo guardar el insumo. Intente nuevamente.',
    );
  });

  it('uses the create title/icon when there is no insumo', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.titulo()).toBe('Registrar nuevo insumo');
    expect(fixture.componentInstance.modoEdicion()).toBe(false);
  });

  it('preloads edit values from the given insumo', () => {
    const insumo = makeInsumo();
    const fixture = openModal(insumo);
    const component = fixture.componentInstance;

    expect(component.titulo()).toBe('Editar insumo');
    expect(component.modoEdicion()).toBe(true);
    expect(component.skuMostrado()).toBe('FR-INS-1');
    expect(component.stockActualMostrado()).toBe('250 kg');
    expect(component.nombre()).toBe('Harina de trigo');
    expect(component.descripcion()).toBe('Harina especial para panificación');
    expect(component.tipo()).toBe('materia_prima');
    expect(component.unidadMedida()).toBe('kg');
    expect(component.stockMinimo()).toBe('50');
    expect(component.stockMaximo()).toBe('400');
  });

  it('PATCHes the insumo with the mapped update request (no stock_actual)', () => {
    const insumo = makeInsumo();
    const fixture = openModal(insumo);
    fixture.componentInstance.nombre.set('Harina de trigo 000');
    fixture.componentInstance.stockMaximo.set('500');

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${INSUMOS_BASE}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      nombre: 'Harina de trigo 000',
      descripcion: 'Harina especial para panificación',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 50,
      stock_maximo: 500,
    });
    req.flush(makeInsumoDto({ id: 1, nombre: 'Harina de trigo 000', stock_maximo: 500 }));
  });
});
