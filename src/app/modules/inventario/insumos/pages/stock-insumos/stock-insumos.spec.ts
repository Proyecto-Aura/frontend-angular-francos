import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { IndicadoresInsumosDto, InsumoDto } from '../../interfaces/insumo-dto.interface';
import { Insumo } from '../../interfaces/insumo.interface';
import { StockInsumos } from './stock-insumos';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;
const INDICADORES_URL = `${INSUMOS_BASE}/indicadores`;
const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 1,
    sku: 'FR-INS-1',
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

function makeInsumo(overrides: Partial<Insumo> = {}): Insumo {
  return {
    id: 1,
    sku: 'FR-INS-1',
    nombre: 'Harina de trigo',
    descripcion: null,
    unidadMedida: 'kg',
    stockActual: 250,
    stockMinimo: 50,
    stockMaximo: 400,
    tipo: 'materia_prima',
    estado: true,
    ...overrides,
  };
}

const INDICADORES_VACIOS: IndicadoresInsumosDto = {
  total: 0,
  normal: 0,
  alto: 0,
  bajo: 0,
  agotado: 0,
};

describe('StockInsumos', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock
      .match(
        (r) =>
          r.url === `${environment.apiUrl}/movimientos-insumo` && r.params.get('limit') === '1',
      )
      .forEach((req) =>
        req.flush({ data: [], meta: { total: 0, page: 1, limit: 1, total_pages: 0 } }),
      );
    httpMock.verify();
  });

  function expectLotesTotalRequest(): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '1',
    );
  }

  // Todos los tests pasan por aca: se consume la peticion del contador de
  // la pestaña "Lotes" (lotesTotal) apenas se crea el fixture, para que no
  // quede pendiente y rompa httpMock.verify() en tests que no la necesitan.
  function create(): ComponentFixture<StockInsumos> {
    const fixture = TestBed.createComponent(StockInsumos);
    fixture.detectChanges();
    expectLotesTotalRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 1, total_pages: 0 },
    });
    return fixture;
  }

  function expectPageRequest(page: number, limit: number): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === INSUMOS_BASE &&
        request.params.get('page') === String(page) &&
        request.params.get('limit') === String(limit),
    );
  }

  function flushPage(
    req: TestRequest,
    data: InsumoDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  function flushIndicadores(dto: IndicadoresInsumosDto = INDICADORES_VACIOS): void {
    httpMock.expectOne(INDICADORES_URL).flush(dto);
  }

  it('loads the real movement count instead of a fixed zero', () => {
    const fixture = create();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/movimientos-insumo` && r.params.get('limit') === '1',
    );
    req.flush({ data: [], meta: { total: 17, page: 1, limit: 1, total_pages: 17 } });
    expect(fixture.componentInstance.tabs().find((t) => t.id === 'historial')?.count).toBe(17);
    httpMock
      .match(() => true)
      .forEach((r) =>
        r.flush({
          data: [],
          meta: { total: 0, page: 1, limit: 100, total_pages: 0 },
          total: 0,
          normal: 0,
          alto: 0,
          bajo: 0,
          agotado: 0,
        }),
      );
  });
  it('loads page one and the summary on initialization', () => {
    create();

    const pageReq = expectPageRequest(1, 10);
    const summaryReq = httpMock.expectOne(INDICADORES_URL);
    expect(pageReq.request.method).toBe('GET');
    expect(summaryReq.request.method).toBe('GET');
    flushPage(pageReq);
    summaryReq.flush(INDICADORES_VACIOS);
  });

  it('exposes the indicadores response as the summary, renaming agotado to agotados', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores({ total: 8, normal: 3, alto: 1, bajo: 2, agotado: 2 });

    expect(fixture.componentInstance.resumen()).toEqual({
      total: 8,
      normal: 3,
      alto: 1,
      bajo: 2,
      agotados: 2,
    });
  });

  it('resets the summary to zero when the indicadores request fails', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    httpMock.expectOne(INDICADORES_URL).flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.resumen()).toEqual({
      total: 0,
      normal: 0,
      alto: 0,
      bajo: 0,
      agotados: 0,
    });
  });

  it('marks a list-loading error', () => {
    const fixture = create();
    expectPageRequest(1, 10).flush('error', { status: 500, statusText: 'Server Error' });
    flushIndicadores();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
  });

  it('computes the nivel badge with the same formula as the backend indicadores', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    const insumo = fixture.componentInstance;
    expect(insumo.nivel(makeInsumo({ stockActual: 0 }))).toBe('agotado');
    expect(insumo.nivel(makeInsumo({ stockActual: 10, stockMinimo: 50 }))).toBe('bajo');
    expect(insumo.nivel(makeInsumo({ stockActual: 380, stockMinimo: 50, stockMaximo: 400 }))).toBe(
      'alto',
    );
    expect(insumo.nivel(makeInsumo({ stockActual: 60, stockMinimo: 50, stockMaximo: 400 }))).toBe(
      'normal',
    );
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    fixture.componentInstance.setSearch('harina');
    httpMock
      .expectOne((r) => r.url === INSUMOS_BASE && r.params.get('search') === 'harina')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setTipo('empaque');
    httpMock
      .expectOne((r) => r.url === INSUMOS_BASE && r.params.get('tipo') === 'empaque')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setNivel('bajo');
    httpMock
      .expectOne((r) => r.url === INSUMOS_BASE && r.params.get('nivel') === 'bajo')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    // El <select> manda el string 'false' y el componente lo convierte al
    // booleano literal que exige el backend (ver insumo.service.ts).
    fixture.componentInstance.setEstado('false');
    httpMock
      .expectOne((r) => r.url === INSUMOS_BASE && r.params.get('estado') === 'false')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeInsumoDto()], 1, 10, 21, 3);
    flushIndicadores();

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone(INSUMOS_BASE);
  });

  it('deactivates an active insumo and reloads the list and the summary', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeInsumoDto({ estado: true })]);
    flushIndicadores();

    fixture.componentInstance.alternarEstado(makeInsumo({ estado: true }));

    const deleteReq = httpMock.expectOne(`${INSUMOS_BASE}/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('activates an inactive insumo', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    fixture.componentInstance.alternarEstado(makeInsumo({ id: 2, estado: false }));

    const activateReq = httpMock.expectOne(`${INSUMOS_BASE}/2/activate`);
    expect(activateReq.request.method).toBe('PATCH');
    activateReq.flush(makeInsumoDto({ id: 2, estado: true }));

    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('opens and closes the lote modal from "Registrar lote"', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    expect(fixture.componentInstance.modalLoteAbierto()).toBe(false);

    fixture.componentInstance.abrirRegistrarLote();
    expect(fixture.componentInstance.modalLoteAbierto()).toBe(true);

    fixture.componentInstance.cerrarFormLote();
    expect(fixture.componentInstance.modalLoteAbierto()).toBe(false);
  });

  it('closes the lote modal and reloads the list and the summary when a lote is saved', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    fixture.componentInstance.abrirRegistrarLote();
    fixture.componentInstance.loteGuardado();

    expect(fixture.componentInstance.modalLoteAbierto()).toBe(false);
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('opens and closes the movimiento modal from "Registrar movimiento", sin preseleccionar insumo', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(false);

    fixture.componentInstance.abrirRegistrarMovimiento();
    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(true);
    expect(fixture.componentInstance.insumoParaMovimiento()).toBeNull();

    fixture.componentInstance.cerrarFormMovimiento();
    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(false);
  });

  it('opens the movimiento modal preseleccionando el insumo de la fila cuando se abre desde su icono', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    const insumo = makeInsumo({ id: 3, nombre: 'Azúcar rubia' });
    fixture.componentInstance.abrirRegistrarMovimiento(insumo);

    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(true);
    expect(fixture.componentInstance.insumoParaMovimiento()).toBe(insumo);

    fixture.componentInstance.cerrarFormMovimiento();
    expect(fixture.componentInstance.insumoParaMovimiento()).toBeNull();
  });

  it('closes the movimiento modal and reloads the list and the summary when a movimiento is saved', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    fixture.componentInstance.abrirRegistrarMovimiento();
    fixture.componentInstance.movimientoGuardado();

    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(false);
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('loads the lotes count for the "Lotes" tab badge on initialization', () => {
    const fixture = TestBed.createComponent(StockInsumos);
    fixture.detectChanges();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    expectLotesTotalRequest().flush({
      data: [],
      meta: { total: 5, page: 1, limit: 1, total_pages: 5 },
    });

    expect(fixture.componentInstance.lotesTotal()).toBe(5);
    expect(fixture.componentInstance.tabs().find((t) => t.id === 'lotes')?.count).toBe(5);
  });

  it('resets the lotes count to zero when that request fails', () => {
    const fixture = TestBed.createComponent(StockInsumos);
    fixture.detectChanges();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    expectLotesTotalRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.lotesTotal()).toBe(0);
  });

  it('switches to the "Lotes" tab and back to "Stock"', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    expect(fixture.componentInstance.activeTab()).toBe('stock');

    fixture.componentInstance.cambiarTab('lotes');
    expect(fixture.componentInstance.activeTab()).toBe('lotes');

    fixture.componentInstance.cambiarTab('historial');
    expect(fixture.componentInstance.activeTab()).toBe('historial');

    fixture.componentInstance.cambiarTab('stock');
    expect(fixture.componentInstance.activeTab()).toBe('stock');
  });
});
