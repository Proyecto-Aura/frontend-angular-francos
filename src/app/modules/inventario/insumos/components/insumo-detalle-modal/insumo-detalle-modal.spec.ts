import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { Insumo } from '../../interfaces/insumo.interface';
import { LoteInsumoDto } from '../../interfaces/lote-insumo-dto.interface';
import { InsumoDetalleModal } from './insumo-detalle-modal';

const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;

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

function makeLoteDto(overrides: Partial<LoteInsumoDto> = {}): LoteInsumoDto {
  return {
    id: 1,
    insumo_id: 1,
    codigo_lote: 'FR-LT-001-261001-INS1',
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

describe('InsumoDetalleModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(insumo: Insumo | null): ComponentFixture<InsumoDetalleModal> {
    const fixture = TestBed.createComponent(InsumoDetalleModal);
    fixture.componentRef.setInput('insumo', insumo);
    fixture.detectChanges();
    return fixture;
  }

  function expectLotesRequest() {
    return httpMock.expectOne(
      (request) => request.url === LOTES_BASE && request.params.get('insumo_id') === '1',
    );
  }

  // Abre el modal y resuelve el pedido de lotes que se dispara apenas se
  // abre (ya no es perezoso por pestaña, ver constructor()).
  function createConLotes(
    insumo: Insumo,
    lotesDto: LoteInsumoDto[] = [],
  ): ComponentFixture<InsumoDetalleModal> {
    const fixture = create(insumo);
    expectLotesRequest().flush({
      data: lotesDto,
      meta: { total: lotesDto.length, page: 1, limit: 50, total_pages: 1 },
    });
    return fixture;
  }

  it('starts on the información tab, closed when insumo is null', () => {
    const fixture = create(null);

    expect(fixture.componentInstance.tabActiva()).toBe('informacion');
  });

  it('computes the nivel from stock_actual vs stock_minimo/stock_maximo', () => {
    const fixture = createConLotes(
      makeInsumo({ stockActual: 60, stockMinimo: 50, stockMaximo: 400 }),
    );

    expect(fixture.componentInstance.nivel()).toBe('normal');
    expect(fixture.componentInstance.nivelLabel()).toBe('Normal');
    expect(fixture.componentInstance.nivelTone()).toBe('success');
  });

  it('builds the información fields, including placeholders for an empty descripcion and no lotes', () => {
    const fixture = createConLotes(makeInsumo({ descripcion: null }), []);

    expect(fixture.componentInstance.campos()).toEqual([
      { label: 'SKU', value: 'FR-INS-1' },
      { label: 'Nombre', value: 'Harina de trigo' },
      { label: 'Tipo', value: 'Materia prima' },
      { label: 'Unidad de medida', value: 'kg' },
      { label: 'Stock actual', value: '250 kg' },
      { label: 'Stock mínimo', value: '50 kg' },
      { label: 'Stock máximo', value: '400 kg' },
      { label: 'Nivel de stock', value: 'Normal' },
      { label: 'Estado', value: 'Activo' },
      { label: 'Próximo vencimiento', value: '—' },
      { label: 'Descripción', value: '—' },
    ]);
  });

  it('computes proximoVencimiento from the first vigente lote (el backend ya los ordena por fecha_vencimiento ascendente)', () => {
    const fixture = createConLotes(makeInsumo(), [
      makeLoteDto({ id: 1, fecha_vencimiento: '2026-11-01' }),
      makeLoteDto({ id: 2, fecha_vencimiento: '2026-12-01' }),
    ]);

    const primero = fixture.componentInstance.lotes()[0];
    expect(fixture.componentInstance.proximoVencimiento()).toBe(primero.fechaVencimientoMostrada);
  });

  it('skips a lote vencido, dado de baja o sin fecha al elegir proximoVencimiento, aunque venga primero en la lista', () => {
    const fixture = createConLotes(makeInsumo(), [
      makeLoteDto({ id: 1, estado: 'vencido', fecha_vencimiento: '2026-01-01' }),
      makeLoteDto({ id: 2, activo: false, fecha_vencimiento: '2026-02-01' }),
      makeLoteDto({ id: 3, fecha_vencimiento: null }),
      makeLoteDto({ id: 4, estado: 'activo', activo: true, fecha_vencimiento: '2026-11-15' }),
    ]);

    const esperado = fixture.componentInstance.lotes()[3].fechaVencimientoMostrada;
    expect(fixture.componentInstance.proximoVencimiento()).toBe(esperado);
  });

  it('falls back to — when no lote tiene una fecha_vencimiento usable', () => {
    const fixture = createConLotes(makeInsumo(), [
      makeLoteDto({ id: 1, fecha_vencimiento: null }),
      makeLoteDto({ id: 2, estado: 'vencido' }),
    ]);

    expect(fixture.componentInstance.proximoVencimiento()).toBe('—');
  });

  it('gives each tab a navigation icon', () => {
    const fixture = createConLotes(makeInsumo());

    expect(fixture.componentInstance.tabs.map((t) => !!t.icon)).toEqual([true, true, true]);
  });

  it('switches tabs and resets to información on close', () => {
    const fixture = createConLotes(makeInsumo());
    const component = fixture.componentInstance;

    component.cambiarTab('lotes');
    expect(component.tabActiva()).toBe('lotes');

    const closed: void[] = [];
    component.closed.subscribe(() => closed.push(undefined));
    component.cerrar();

    expect(component.tabActiva()).toBe('informacion');
    expect(closed.length).toBe(1);
  });

  it('requests lotes as soon as the insumo opens, regardless of which tab is active', () => {
    const fixture = create(makeInsumo());

    expect(fixture.componentInstance.tabActiva()).toBe('informacion');
    expectLotesRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 50, total_pages: 0 },
    });
  });

  it('loads lotes for the insumo, formatting fechas y cantidades', () => {
    const fixture = create(makeInsumo());

    expectLotesRequest().flush({
      data: [makeLoteDto()],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    expect(fixture.componentInstance.lotes()).toEqual([
      {
        codigoLote: 'FR-LT-001-261001-INS1',
        fechaIngresoMostrada: expect.stringContaining('2026'),
        fechaVencimientoMostrada: expect.stringContaining('2026'),
        cantidadInicialMostrada: '100 kg',
        cantidadActualMostrada: '60 kg',
        estado: 'activo',
        activo: true,
        diasParaVencer: expect.any(Number),
      },
    ]);
  });

  it('flags a lote as about to expire when it is activo and within 10 days of fecha_vencimiento', () => {
    const fixture = create(makeInsumo());
    const hoy = new Date();
    const enCincoDias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 5);
    const fechaVencimiento = `${enCincoDias.getFullYear()}-${String(enCincoDias.getMonth() + 1).padStart(2, '0')}-${String(enCincoDias.getDate()).padStart(2, '0')}`;

    expectLotesRequest().flush({
      data: [makeLoteDto({ fecha_vencimiento: fechaVencimiento })],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.diasParaVencer).toBe(5);
    expect(fixture.componentInstance.muestraAlertaVencimiento(fila.diasParaVencer)).toBe(true);
  });

  it('parses fecha_ingreso/fecha_vencimiento even when the backend sends a full datetime instead of a plain date', () => {
    const fixture = create(makeInsumo());

    expectLotesRequest().flush({
      data: [
        makeLoteDto({
          fecha_ingreso: '2026-09-10T00:00:00.000Z',
          fecha_vencimiento: '2026-12-10T00:00:00.000Z',
        }),
      ],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    expect(fixture.componentInstance.errorLotes()).toBe(false);
    const [fila] = fixture.componentInstance.lotes();
    expect(fila.fechaIngresoMostrada).toContain('2026');
    expect(fila.fechaVencimientoMostrada).toContain('2026');
    expect(fila.diasParaVencer).not.toBeNaN();
  });

  it('does not flag a vencido lote as about to expire (ya paso, no es una alerta de proximidad)', () => {
    const fixture = create(makeInsumo());

    expectLotesRequest().flush({
      data: [makeLoteDto({ estado: 'vencido', fecha_vencimiento: '2026-01-01' })],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.diasParaVencer).toBeNull();
    expect(fixture.componentInstance.muestraAlertaVencimiento(fila.diasParaVencer)).toBe(false);
  });

  it('shows an error state with retry when the lotes request fails', () => {
    const fixture = create(makeInsumo());

    expectLotesRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.errorLotes()).toBe(true);

    fixture.componentInstance.cargarLotes(makeInsumo());
    expectLotesRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    expect(fixture.componentInstance.errorLotes()).toBe(false);
  });

  it('cancels a pending lotes request when a newer one starts, so a late/stale response cannot win the race', () => {
    const fixture = createConLotes(makeInsumo());
    const component = fixture.componentInstance;

    component.cargarLotes(makeInsumo());
    component.cargarLotes(makeInsumo());

    const pendientes = httpMock.match(
      (request) => request.url === LOTES_BASE && request.params.get('insumo_id') === '1',
    );
    expect(pendientes).toHaveLength(2);
    expect(pendientes[0].cancelled).toBe(true);

    // La vieja (cancelada) nunca se flushea — si igual intentara resolver,
    // no deberia pisar el resultado de la nueva.
    pendientes[1].flush({
      data: [makeLoteDto()],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    expect(component.lotes()).toHaveLength(1);
  });
});
