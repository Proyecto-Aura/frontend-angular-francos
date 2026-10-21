import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { LoteInsumoDto } from '../../interfaces/lote-insumo-dto.interface';
import { MovimientoFormModal } from './movimiento-form-modal';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;
const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;

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
    codigo_lote: 'FR-LT-001-261001-INS9',
    fecha_ingreso: '2026-10-01',
    fecha_vencimiento: '2026-11-01',
    cantidad_inicial: 50,
    cantidad_actual: 50,
    estado: 'activo',
    activo: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MovimientoFormModal', () => {
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
  ): ComponentFixture<MovimientoFormModal> {
    const fixture = TestBed.createComponent(MovimientoFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === INSUMOS_BASE)
      .flush({
        data: insumos,
        meta: { total: insumos.length, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();

    return fixture;
  }

  function seleccionarInsumoYResolverLotes(
    fixture: ComponentFixture<MovimientoFormModal>,
    filaId: number,
    insumoId: string,
    lotes: LoteInsumoDto[],
  ): void {
    fixture.componentInstance.seleccionarInsumoDeFila(filaId, insumoId);
    httpMock
      .expectOne(
        (request) => request.url === LOTES_BASE && request.params.get('insumo_id') === insumoId,
      )
      .flush({ data: lotes, meta: { total: lotes.length, page: 1, limit: 100, total_pages: 1 } });
    fixture.detectChanges();
  }

  it('loads active insumos into the combobox options when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.insumosOptions()).toEqual([
      { value: '9', label: 'FR-INS-9 · Harina de trigo' },
    ]);
  });

  it('resets the form with one empty fila and no errors when opened', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    expect(component.tipoMovimiento()).toBe('entrada');
    expect(component.motivoGeneral()).toBe('');
    expect(component.filas()).toEqual([{ id: 1, insumoId: '', loteId: '', cantidad: '' }]);
    expect(component.errores()).toEqual({});
    expect(component.cantidadInsumosEnMovimiento()).toBe(0);
  });

  it('adds and removes filas', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.agregarFila();
    expect(component.filas()).toEqual([
      { id: 1, insumoId: '', loteId: '', cantidad: '' },
      { id: 2, insumoId: '', loteId: '', cantidad: '' },
    ]);

    component.quitarFila(1);
    expect(component.filas()).toEqual([{ id: 2, insumoId: '', loteId: '', cantidad: '' }]);
  });

  it('requests the active lotes of the chosen insumo and fills the select options (tipo entrada)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', fecha_vencimiento: '2026-11-01' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LT-002', fecha_vencimiento: '2026-12-01' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '1', label: 'FR-LT-001 · vence 2026-11-01 · 50 disp.' },
      { value: '2', label: 'FR-LT-002 · vence 2026-12-01 · 50 disp.' },
    ]);
  });

  it('clears the previously selected lote when the insumo changes', () => {
    const fixture = openModal([
      makeInsumoDto({ id: 9 }),
      makeInsumoDto({ id: 10, sku: 'FR-INS-10' }),
    ]);
    const component = fixture.componentInstance;
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto()]);
    component.seleccionarLoteDeFila(1, '1');

    seleccionarInsumoYResolverLotes(fixture, 1, '10', []);

    expect(component.filas()[0].loteId).toBe('');
  });

  it('does not refetch lotes for an insumo already cached', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.agregarFila();
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto()]);

    // Segunda fila elige el mismo insumo: no deberia haber otra request.
    component.seleccionarInsumoDeFila(2, '9');
    httpMock.expectNone((request) => request.url === LOTES_BASE);
  });

  it('simulates the FEFO breakdown across lotes for tipo salida', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({
        id: 1,
        codigo_lote: 'FR-LT-001',
        cantidad_actual: 50,
        fecha_vencimiento: '2026-11-01',
      }),
      makeLoteDto({
        id: 2,
        codigo_lote: 'FR-LT-002',
        cantidad_actual: 30,
        fecha_vencimiento: '2026-12-01',
      }),
    ]);
    component.actualizarCantidadDeFila(1, '80');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose).toEqual({
      lineas: ['FR-LT-001: −50', 'FR-LT-002: −30'],
      cargando: false,
      insuficiente: false,
    });
  });

  it('flags insuficiente when the cantidad exceeds the sum of all active lotes', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 50 }),
    ]);
    component.actualizarCantidadDeFila(1, '80');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose).toEqual({ lineas: ['FR-LT-001: −50'], cargando: false, insuficiente: true });
  });

  it('shows an empty breakdown while cantidad is not filled yet', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto()]);

    expect(component.desgloseFefoDeFila(component.filas()[0])).toEqual({
      lineas: [],
      cargando: false,
      insuficiente: false,
    });
  });

  it('shows — for stock actual/mínimo until an insumo is selected on that fila', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const fila = component.filas()[0];

    expect(component.stockActualDeFila(fila)).toBe('—');
    expect(component.stockMinimoDeFila(fila)).toBe('—');

    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);
    const filaConInsumo = component.filas()[0];

    expect(component.stockActualDeFila(filaConInsumo)).toBe('250 kg');
    expect(component.stockMinimoDeFila(filaConInsumo)).toBe('50 kg');
  });

  it('computes stock resultante adding the cantidad for entrada', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);
    component.actualizarCantidadDeFila(1, '30');

    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('280 kg');
  });

  it('computes stock resultante subtracting the cantidad for salida', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);
    component.actualizarCantidadDeFila(1, '30');

    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('220 kg');
  });

  it('does not emit and marks required fields for an empty entrada form (incluye lote)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const registrados: unknown[] = [];
    let closed = 0;
    component.registrado.subscribe((form) => registrados.push(form));
    component.closed.subscribe(() => closed++);

    component.guardar();

    expect(registrados).toEqual([]);
    expect(closed).toBe(0);
    expect(component.errores()).toMatchObject({
      motivoGeneral: 'Requerido.',
      porFila: {
        1: {
          insumoId: 'Selecciona un insumo.',
          loteId: 'Selecciona un lote.',
          cantidad: 'Debe ser mayor a 0.',
        },
      },
    });
  });

  it('emits registrado and closed for a valid entrada form, incluyendo el loteId', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const registrados: unknown[] = [];
    let closed = 0;
    component.registrado.subscribe((form) => registrados.push(form));
    component.closed.subscribe(() => closed++);

    component.motivoGeneral.set('Compra a proveedor');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();

    expect(registrados).toEqual([
      {
        tipoMovimiento: 'entrada',
        motivoGeneral: 'Compra a proveedor',
        filas: [{ id: 1, insumoId: '9', loteId: '1', cantidad: '30' }],
      },
    ]);
    expect(closed).toBe(1);
  });

  it('emits registrado for a valid salida form without requiring a loteId', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const registrados: unknown[] = [];
    component.registrado.subscribe((form) => registrados.push(form));

    component.seleccionarTipoMovimiento('salida');
    component.motivoGeneral.set('Merma');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();

    expect(registrados).toEqual([
      {
        tipoMovimiento: 'salida',
        motivoGeneral: 'Merma',
        filas: [{ id: 1, insumoId: '9', loteId: '', cantidad: '10' }],
      },
    ]);
  });
});
