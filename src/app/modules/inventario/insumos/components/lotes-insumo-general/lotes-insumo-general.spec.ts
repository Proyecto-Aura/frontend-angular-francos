import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { LoteInsumoDto } from '../../interfaces/lote-insumo-dto.interface';
import { LotesInsumoGeneral } from './lotes-insumo-general';

const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;
const INSUMOS_BASE = `${environment.apiUrl}/insumos`;

function makeLoteDto(overrides: Partial<LoteInsumoDto> = {}): LoteInsumoDto {
  return {
    id: 1,
    insumo_id: 9,
    codigo_lote: 'FR-LT-005-260910-INS9',
    fecha_ingreso: '2026-09-10',
    fecha_vencimiento: '2026-12-10',
    cantidad_inicial: 100,
    cantidad_actual: 60,
    estado: 'activo',
    activo: true,
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 9,
    sku: 'FR-INS001',
    nombre: 'Harina de trigo',
    descripcion: null,
    unidad_medida: 'kg',
    stock_actual: 60,
    stock_minimo: 20,
    stock_maximo: 200,
    tipo: 'materia_prima',
    estado: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('LotesInsumoGeneral', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<LotesInsumoGeneral> {
    const fixture = TestBed.createComponent(LotesInsumoGeneral);
    fixture.detectChanges();
    return fixture;
  }

  function expectLotesRequest(): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '10',
    );
  }

  function expectInsumosRequest(): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === INSUMOS_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
  }

  function flushLotes(
    req: TestRequest,
    data: LoteInsumoDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  it('requests lotes and insumos (en paralelo) as soon as it loads, with no filters', () => {
    const fixture = create();
    const lotesReq = expectLotesRequest();
    expect(lotesReq.request.params.has('search')).toBe(false);
    expect(lotesReq.request.params.has('insumo_id')).toBe(false);
    expect(lotesReq.request.params.has('estado')).toBe(false);
    expect(lotesReq.request.params.has('vence_desde')).toBe(false);
    expect(lotesReq.request.params.has('vence_hasta')).toBe(false);

    flushLotes(lotesReq);
    expectInsumosRequest().flush({
      data: [makeInsumoDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('joins each lote con su insumo (nombre/SKU/unidad), sin importar el orden de llegada de las dos respuestas', () => {
    const fixture = create();
    const lotesReq = expectLotesRequest();
    const insumosReq = expectInsumosRequest();

    // La respuesta de insumos llega DESPUES que la de lotes — el join via
    // computed() tiene que resolverse igual, no quedarse con el insumo
    // "—" que hubiera salido si solo se armara la fila una vez al llegar.
    flushLotes(lotesReq, [makeLoteDto()]);
    insumosReq.flush({
      data: [makeInsumoDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila).toMatchObject({
      codigoLote: 'FR-LT-005-260910-INS9',
      insumoNombre: 'Harina de trigo',
      insumoSku: 'FR-INS001',
      cantidadInicialMostrada: '100 kg',
      cantidadActualMostrada: '60 kg',
      estado: 'activo',
      diasParaVencer: null,
    });
  });

  it('orders lotes by fecha_vencimiento ascendente (los mas proximos a vencer primero), sin fecha al final', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [
      makeLoteDto({ id: 1, codigo_lote: 'SIN-FECHA', fecha_vencimiento: null }),
      makeLoteDto({ id: 2, codigo_lote: 'LEJOS', fecha_vencimiento: '2026-12-01' }),
      makeLoteDto({ id: 3, codigo_lote: 'CERCA', fecha_vencimiento: '2026-10-15' }),
    ]);
    expectInsumosRequest().flush({
      data: [makeInsumoDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(fixture.componentInstance.lotes().map((l) => l.codigoLote)).toEqual([
      'CERCA',
      'LEJOS',
      'SIN-FECHA',
    ]);
  });

  it('shows — para nombre/sku si el insumo del lote no esta en el catalogo cargado', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto({ insumo_id: 999 })]);
    expectInsumosRequest().flush({
      data: [makeInsumoDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.insumoNombre).toBe('—');
    expect(fila.insumoSku).toBe('—');
  });

  it('computes diasParaVencer solo cuando el backend ya clasifico el lote como por_vencer', () => {
    const fixture = create();
    const hoy = new Date();
    const enDiezDias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 10);
    const fechaVencimiento = `${enDiezDias.getFullYear()}-${String(enDiezDias.getMonth() + 1).padStart(2, '0')}-${String(enDiezDias.getDate()).padStart(2, '0')}`;

    flushLotes(expectLotesRequest(), [
      makeLoteDto({ estado: 'por_vencer', fecha_vencimiento: fechaVencimiento }),
    ]);
    expectInsumosRequest().flush({
      data: [makeInsumoDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.diasParaVencer).toBe(10);
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    expectInsumosRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 100, total_pages: 0 },
    });

    fixture.componentInstance.setSearch('harina');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('search') === 'harina')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setInsumo('9');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('insumo_id') === '9')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setEstado('por_vencer');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('estado') === 'por_vencer')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setVenceDesde('2026-10-01');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('vence_desde') === '2026-10-01')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setVenceHasta('2026-10-31');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('vence_hasta') === '2026-10-31')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    expect(fixture.componentInstance.hayFiltros()).toBe(true);
  });

  it('does not call the backend when vence desde es posterior a vence hasta', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    expectInsumosRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 100, total_pages: 0 },
    });

    fixture.componentInstance.setVenceDesde('2026-10-31');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('vence_desde') === '2026-10-31')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setVenceHasta('2026-10-01');

    expect(fixture.componentInstance.rangoInvalido()).toBe(true);
    httpMock.expectNone(
      (r) => r.url === LOTES_BASE && r.params.get('vence_hasta') === '2026-10-01',
    );
  });

  it('limpiarFiltros resets everything to page 1 and reloads with no filters', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    expectInsumosRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 100, total_pages: 0 },
    });

    fixture.componentInstance.setSearch('harina');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('search') === 'harina')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    expect(fixture.componentInstance.hayFiltros()).toBe(true);
    fixture.componentInstance.limpiarFiltros();

    const req = httpMock.expectOne(
      (r) =>
        r.url === LOTES_BASE &&
        r.params.get('page') === '1' &&
        !r.params.has('search') &&
        !r.params.has('insumo_id') &&
        !r.params.has('estado') &&
        !r.params.has('vence_desde') &&
        !r.params.has('vence_hasta'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
    expect(fixture.componentInstance.hayFiltros()).toBe(false);
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto()], 1, 10, 21, 3);
    expectInsumosRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 100, total_pages: 0 },
    });

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone(LOTES_BASE);
  });

  it('shows an error state with retry when the lotes request fails', () => {
    const fixture = create();
    expectLotesRequest().flush('error', { status: 500, statusText: 'Server Error' });
    expectInsumosRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 100, total_pages: 0 },
    });

    expect(fixture.componentInstance.errorCarga()).toBe(true);

    fixture.componentInstance.cargarLotes();
    flushLotes(expectLotesRequest());

    expect(fixture.componentInstance.errorCarga()).toBe(false);
  });

  it('falls back to an empty insumo catalog when that request fails, keeping lotes usable', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto()]);
    expectInsumosRequest().flush('error', { status: 500, statusText: 'Server Error' });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.insumoNombre).toBe('—');
  });
});
