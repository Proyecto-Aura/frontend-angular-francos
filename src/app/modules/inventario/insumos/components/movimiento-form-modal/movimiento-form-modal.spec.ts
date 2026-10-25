import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { LoteInsumoDto } from '../../interfaces/lote-insumo-dto.interface';
import { MovimientoFormModal } from './movimiento-form-modal';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;
const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;
const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-insumo`;

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

function makeMovimientoRespuestaDto(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 1,
    codigo: 'FR-MV-001-261022-INS9',
    lote_insumo_id: 1,
    codigo_lote: 'FR-LT-001',
    insumo_id: 9,
    insumo_nombre: 'Harina de trigo',
    insumo_sku: 'FR-INS-9',
    insumo_unidad_medida: 'kg',
    tipo: 'entrada',
    cantidad: 30,
    stock_anterior: 250,
    stock_resultante: 280,
    razon: 'Compra a proveedor',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
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
      { value: '9', label: 'Harina de trigo', secondary: 'FR-INS-9' },
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

  it('preloads the insumo of the first fila and requests its active lotes when opened from a row ("Registrar movimiento" icon)', () => {
    const fixture = TestBed.createComponent(MovimientoFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('insumoPreseleccionado', {
      id: 9,
      sku: 'FR-INS-9',
      nombre: 'Harina de trigo',
      descripcion: null,
      unidadMedida: 'kg',
      stockActual: 250,
      stockMinimo: 50,
      stockMaximo: 400,
      tipo: 'materia_prima',
      estado: true,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filas()).toEqual([
      { id: 1, insumoId: '9', loteId: '', cantidad: '' },
    ]);

    httpMock
      .expectOne((request) => request.url === INSUMOS_BASE)
      .flush({ data: [makeInsumoDto()], meta: { total: 1, page: 1, limit: 100, total_pages: 1 } });
    httpMock
      .expectOne((request) => request.url === LOTES_BASE && request.params.get('insumo_id') === '9')
      .flush({
        data: [makeLoteDto()],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });

    expect(fixture.componentInstance.lotesDeFila(fixture.componentInstance.filas()[0])).toEqual([
      expect.objectContaining({ id: 1 }),
    ]);
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
      { value: '1', label: 'FR-LT-001', secondary: '50 disp.' },
      { value: '2', label: 'FR-LT-002', secondary: '50 disp.' },
    ]);
  });

  it('on entrada, excludes lotes vencidos from the select options (no tiene sentido sumarle stock)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', estado: 'vencido' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LT-002', estado: 'activo' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '2', label: 'FR-LT-002', secondary: '50 disp.' },
    ]);
  });

  it('on ajuste, includes lotes vencidos in the select options (corregir el conteo real igual aplica)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', estado: 'vencido' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LT-002', estado: 'activo' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '1', label: 'FR-LT-001', secondary: '50 disp.' },
      { value: '2', label: 'FR-LT-002', secondary: '50 disp.' },
    ]);
  });

  it('on salida, excludes lotes vencidos from the FEFO breakdown (igual que ahora hace el backend)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({
        id: 1,
        codigo_lote: 'FR-LT-001',
        estado: 'vencido',
        cantidad_actual: 50,
        fecha_vencimiento: '2026-01-01',
      }),
      makeLoteDto({
        id: 2,
        codigo_lote: 'FR-LT-002',
        estado: 'activo',
        cantidad_actual: 30,
        fecha_vencimiento: '2026-12-01',
      }),
    ]);
    component.actualizarCantidadDeFila(1, '20');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose.lineas).toEqual([{ texto: 'FR-LT-002: −20', resultado: '10 kg' }]);
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

  it('defaults stockLoteDeFila to — and fills it with the unidad del insumo once a lote is chosen', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 35 }),
    ]);

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('—');

    component.seleccionarLoteDeFila(1, '1');

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('35 kg');
  });

  it('shows only the resulting lote stock once a cantidad is typed, sin flechita', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 35 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '15');

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('50 kg');
  });

  it('on ajuste, stockLoteDeFila shows the cantidad real tal cual (no la suma al lote)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');

    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');

    // Sin cantidad escrita todavia: muestra lo que ya tiene el lote.
    expect(component.stockLoteDeFila(component.filas()[0])).toBe('50 kg');
    expect(component.cantidadActualLoteDeFila(component.filas()[0])).toBe('50 kg');

    component.actualizarCantidadDeFila(1, '35');

    // La cantidad real contada, no 50 + 35.
    expect(component.stockLoteDeFila(component.filas()[0])).toBe('35 kg');
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
      lineas: [
        { texto: 'FR-LT-001: −50', resultado: '0 kg' },
        { texto: 'FR-LT-002: −30', resultado: '0 kg' },
      ],
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

    expect(desglose).toEqual({
      lineas: [{ texto: 'FR-LT-001: −50', resultado: '0 kg' }],
      cargando: false,
      insuficiente: true,
    });
  });

  it('shows how much remains in a lote that is only partially consumed', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 50 }),
    ]);
    component.actualizarCantidadDeFila(1, '20');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose).toEqual({
      lineas: [{ texto: 'FR-LT-001: −20', resultado: '30 kg' }],
      cargando: false,
      insuficiente: false,
    });
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

  it('shows — for stock actual/límite until an insumo is selected on that fila', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const fila = component.filas()[0];

    expect(component.stockActualDeFila(fila)).toBe('—');
    expect(component.stockLimiteDeFila(fila)).toBe('—');

    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);
    const filaConInsumo = component.filas()[0];

    expect(component.stockActualDeFila(filaConInsumo)).toBe('250 kg');
    expect(component.stockLimiteDeFila(filaConInsumo)).toBe('400 kg');
  });

  it('shows stock mínimo as the límite for tipo salida, en vez del máximo', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);

    expect(component.stockLimiteDeFila(component.filas()[0])).toBe('50 kg');
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

  it('accumulates cantidad top-to-bottom across filas sharing el mismo insumo (en cascada)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LT-002' }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '50');

    component.agregarFila();
    component.seleccionarInsumoDeFila(2, '9');
    component.seleccionarLoteDeFila(2, '2');
    component.actualizarCantidadDeFila(2, '40');

    // Fila 1 (primera) solo arrastra lo suyo: 250 + 50 = 300.
    // Fila 2 (debajo) arrastra lo de arriba tambien: 250 + 50 + 40 = 340.
    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('300 kg');
    expect(component.stockResultanteDeFila(component.filas()[1])).toBe('340 kg');

    // Cambiar la fila de ARRIBA (1) si mueve el resultado de la de abajo (2).
    component.actualizarCantidadDeFila(1, '60');
    expect(component.stockResultanteDeFila(component.filas()[1])).toBe('350 kg');

    // Pero cambiar la fila de ABAJO (2) no mueve el resultado de la de
    // arriba (1) — no cuenta lo que todavia no paso en el orden de la tabla.
    component.actualizarCantidadDeFila(2, '999');
    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('310 kg');

    // Al quitar una fila, el total deja de contarla.
    component.quitarFila(2);
    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('310 kg');
  });

  it('on ajuste, stockResultanteDeFila usa el delta contra el lote (cantidad real − cantidad actual), no la cantidad real en si', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '35');

    // Delta = 35 − 50 = −15 → 250 − 15 = 235 (no 250 + 35).
    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('235 kg');
  });

  it('does not call the backend and marks required fields for an empty entrada form (incluye lote)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[] = [];
    let closed = 0;
    component.saved.subscribe((movimientos) => guardados.push(movimientos));
    component.closed.subscribe(() => closed++);

    component.guardar();

    httpMock.expectNone(`${MOVIMIENTOS_BASE}/entrada`);
    expect(guardados).toEqual([]);
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

  it('posts a batch entrada with lote_insumo_id and emits saved/closed on success', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[][] = [];
    let closed = 0;
    component.saved.subscribe((movimientos) => guardados.push(movimientos));
    component.closed.subscribe(() => closed++);

    component.motivoGeneral.set('Compra a proveedor');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    expect(component.guardando()).toBe(true);

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/entrada`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_insumo_id: 1, cantidad: 30, razon: 'Compra a proveedor' },
    ]);
    req.flush([makeMovimientoRespuestaDto()]);

    expect(component.guardando()).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject([{ id: 1, codigoLote: 'FR-LT-001' }]);
    expect(closed).toBe(1);
  });

  it('posts a batch salida with insumo_id instead of lote_insumo_id (sin loteId)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.seleccionarTipoMovimiento('salida');
    component.motivoGeneral.set('Merma');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', []);
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/salida`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([{ insumo_id: 9, cantidad: 10, razon: 'Merma' }]);
    req.flush([makeMovimientoRespuestaDto({ tipo: 'salida' })]);
  });

  it('posts a batch ajuste with the signed delta, not the cantidad real que escribió la persona', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.seleccionarTipoMovimiento('ajuste');
    component.motivoGeneral.set('Conteo físico');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '35');

    component.guardar();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/ajuste`);
    expect(req.request.method).toBe('POST');
    // 35 (real) − 50 (actual) = −15, no 35.
    expect(req.request.body).toEqual([
      { lote_insumo_id: 1, cantidad: -15, razon: 'Conteo físico' },
    ]);
    req.flush([makeMovimientoRespuestaDto({ tipo: 'ajuste', cantidad: -15 })]);
  });

  it('blocks guardar on ajuste when la cantidad real es igual a la actual (sin cambio)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.seleccionarTipoMovimiento('ajuste');
    component.motivoGeneral.set('Conteo físico');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LT-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '50');

    component.guardar();

    httpMock.expectNone(`${MOVIMIENTOS_BASE}/ajuste`);
    expect(component.errorDeFila(1, 'cantidad')).toBe('La cantidad no cambió.');
  });

  it('shows the fila-specific error message the backend sends back for a failed batch', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.motivoGeneral.set('Compra a proveedor');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    httpMock
      .expectOne(`${MOVIMIENTOS_BASE}/entrada`)
      .flush(
        { statusCode: 404, message: 'Lote no encontrado (lote_insumo_id=1)' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(component.guardando()).toBe(false);
    expect(component.errorGeneral()).toBe('Lote no encontrado (lote_insumo_id=1)');
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.motivoGeneral.set('Compra a proveedor');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    httpMock
      .expectOne(`${MOVIMIENTOS_BASE}/entrada`)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.errorGeneral()).toBe('No tiene permisos para registrar movimientos.');
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.motivoGeneral.set('Compra a proveedor');
    seleccionarInsumoYResolverLotes(fixture, 1, '9', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    httpMock
      .expectOne(`${MOVIMIENTOS_BASE}/entrada`)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(component.errorGeneral()).toBe(
      'No se pudo registrar el movimiento. Intente nuevamente.',
    );
  });
});
