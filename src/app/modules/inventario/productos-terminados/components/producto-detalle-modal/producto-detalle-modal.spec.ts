import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { LoteProductoTerminadoDto } from '../../interfaces/lote-producto-terminado-dto.interface';
import { MovimientoProductoTerminadoDto } from '../../interfaces/movimiento-producto-terminado-dto.interface';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import { ProductoDetalleModal } from './producto-detalle-modal';

const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;
const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-producto-terminado`;

function makeProducto(overrides: Partial<ProductoPresentacion> = {}): ProductoPresentacion {
  return {
    id: 7,
    productoTerminadoId: 256,
    sku: 'FR-P3-PR2',
    productoNombre: 'Pan de molde',
    productoDescripcion: 'Pan de molde integral, bolsa sellada.',
    categoriaId: 2,
    categoriaNombre: 'Panadería',
    presentacionId: 2,
    presentacionCantidad: 500,
    presentacionUnidadMedida: 'gr',
    estado: true,
    stockActual: 250,
    stockMinimo: 50,
    stockMaximo: 400,
    ...overrides,
  };
}

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 256,
    sku: 'FR-P3-PR2',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LTP-001-261001-PT256',
    fecha_produccion: '2026-09-10',
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

function makeMovimientoDto(
  overrides: Partial<MovimientoProductoTerminadoDto> = {},
): MovimientoProductoTerminadoDto {
  return {
    id: 1,
    codigo: 'FR-MVP-001-261022-PT256',
    lote_producto_terminado_id: 1,
    codigo_lote: 'FR-LTP-001-261001-PT256',
    producto_terminado_id: 256,
    sku: 'FR-P3-PR2',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    tipo: 'entrada',
    cantidad: 100,
    stock_anterior: 170,
    stock_resultante: 270,
    razon: 'Producción del día',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
    ...overrides,
  };
}

describe('ProductoDetalleModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(producto: ProductoPresentacion | null): ComponentFixture<ProductoDetalleModal> {
    const fixture = TestBed.createComponent(ProductoDetalleModal);
    fixture.componentRef.setInput('producto', producto);
    fixture.detectChanges();
    return fixture;
  }

  function expectLotesRequest() {
    return httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE && request.params.get('producto_terminado_id') === '256',
    );
  }

  // Abre el modal y resuelve el pedido de lotes que se dispara apenas se
  // abre (ya no es perezoso por pestaña, ver constructor()).
  function createConLotes(
    producto: ProductoPresentacion,
    lotesDto: LoteProductoTerminadoDto[] = [],
  ): ComponentFixture<ProductoDetalleModal> {
    const fixture = create(producto);
    expectLotesRequest().flush({
      data: lotesDto,
      meta: { total: lotesDto.length, page: 1, limit: 50, total_pages: 1 },
    });
    return fixture;
  }

  it('starts on the información tab, closed when producto is null', () => {
    const fixture = create(null);

    expect(fixture.componentInstance.tabActiva()).toBe('informacion');
  });

  it('computes the nivel from stock_actual vs stock_minimo/stock_maximo', () => {
    const fixture = createConLotes(
      makeProducto({ stockActual: 60, stockMinimo: 50, stockMaximo: 400 }),
    );

    expect(fixture.componentInstance.nivel()).toBe('normal');
    expect(fixture.componentInstance.nivelLabel()).toBe('Normal');
    expect(fixture.componentInstance.nivelTone()).toBe('success');
  });

  it('builds the información fields, including placeholders for stock máximo nulo, descripcion vacia y sin lotes', () => {
    const fixture = createConLotes(
      makeProducto({ productoDescripcion: null, stockMaximo: null }),
      [],
    );

    expect(fixture.componentInstance.campos()).toEqual([
      { label: 'SKU', value: 'FR-P3-PR2' },
      { label: 'Nombre', value: 'Pan de molde' },
      { label: 'Categoría', value: 'Panadería' },
      { label: 'Presentación', value: '500 gr' },
      { label: 'Unidad de medida', value: 'gr' },
      { label: 'Stock actual', value: '250 unid.' },
      { label: 'Stock mínimo', value: '50 unid.' },
      { label: 'Stock máximo', value: '—' },
      { label: 'Nivel de stock', value: 'Normal' },
      { label: 'Estado', value: 'Activo' },
      { label: 'Próximo vencimiento', value: '—' },
      { label: 'Descripción', value: '—' },
    ]);
  });

  it('computes proximoVencimiento from the first vigente lote (el backend ya los ordena por fecha_vencimiento ascendente)', () => {
    const fixture = createConLotes(makeProducto(), [
      makeLoteDto({ id: 1, fecha_vencimiento: '2026-11-01' }),
      makeLoteDto({ id: 2, fecha_vencimiento: '2026-12-01' }),
    ]);

    const primero = fixture.componentInstance.lotes()[0];
    expect(fixture.componentInstance.proximoVencimiento()).toBe(primero.fechaVencimientoMostrada);
  });

  it('incluye un lote por_vencer al elegir proximoVencimiento (sigue siendo stock utilizable)', () => {
    const fixture = createConLotes(makeProducto(), [
      makeLoteDto({ id: 1, estado: 'por_vencer', fecha_vencimiento: '2026-11-01' }),
      makeLoteDto({ id: 2, fecha_vencimiento: '2026-12-01' }),
    ]);

    const primero = fixture.componentInstance.lotes()[0];
    expect(fixture.componentInstance.proximoVencimiento()).toBe(primero.fechaVencimientoMostrada);
  });

  it('skips a lote vencido, dado de baja o sin fecha al elegir proximoVencimiento, aunque venga primero en la lista', () => {
    const fixture = createConLotes(makeProducto(), [
      makeLoteDto({ id: 1, estado: 'vencido', fecha_vencimiento: '2026-01-01' }),
      makeLoteDto({ id: 2, activo: false, fecha_vencimiento: '2026-02-01' }),
      makeLoteDto({ id: 3, fecha_vencimiento: null }),
      makeLoteDto({ id: 4, estado: 'activo', activo: true, fecha_vencimiento: '2026-11-15' }),
    ]);

    const esperado = fixture.componentInstance.lotes()[3].fechaVencimientoMostrada;
    expect(fixture.componentInstance.proximoVencimiento()).toBe(esperado);
  });

  it('falls back to — when no lote tiene una fecha_vencimiento usable', () => {
    const fixture = createConLotes(makeProducto(), [
      makeLoteDto({ id: 1, fecha_vencimiento: null }),
      makeLoteDto({ id: 2, estado: 'vencido' }),
    ]);

    expect(fixture.componentInstance.proximoVencimiento()).toBe('—');
  });

  it('gives each tab a navigation icon', () => {
    const fixture = createConLotes(makeProducto());

    expect(fixture.componentInstance.tabs.map((t) => !!t.icon)).toEqual([true, true, true]);
  });

  it('switches tabs and resets to información on close', () => {
    const fixture = createConLotes(makeProducto());
    const component = fixture.componentInstance;

    component.cambiarTab('lotes');
    expect(component.tabActiva()).toBe('lotes');

    const closed: void[] = [];
    component.closed.subscribe(() => closed.push(undefined));
    component.cerrar();

    expect(component.tabActiva()).toBe('informacion');
    expect(closed.length).toBe(1);
  });

  it('requests lotes as soon as the producto opens, regardless of which tab is active', () => {
    create(makeProducto());

    expectLotesRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 50, total_pages: 0 },
    });
  });

  it('does not request lotes ni movimientos cuando productoTerminadoId es null (caso rarisimo)', () => {
    const fixture = create(makeProducto({ productoTerminadoId: null }));

    httpMock.expectNone(LOTES_BASE);
    expect(fixture.componentInstance.lotes()).toEqual([]);

    fixture.componentInstance.cambiarTab('historial');
    fixture.detectChanges();
    httpMock.expectNone(MOVIMIENTOS_BASE);
  });

  it('loads lotes for the producto, mapping cada campo (sin sufijo de unidad)', () => {
    const fixture = create(makeProducto());

    expectLotesRequest().flush({
      data: [makeLoteDto()],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    expect(fixture.componentInstance.lotes()).toEqual([
      {
        codigoLote: 'FR-LTP-001-261001-PT256',
        fechaProduccionMostrada: expect.stringContaining('2026'),
        fechaVencimientoMostrada: expect.stringContaining('2026'),
        cantidadInicialMostrada: '100 unid.',
        cantidadActualMostrada: '60 unid.',
        estado: 'activo',
        activo: true,
        // "activo" (no "por_vencer") significa que al backend todavia le
        // quedan mas de 15 dias — no hace falta el conteo de dias.
        diasParaVencer: null,
      },
    ]);
  });

  it('computes diasParaVencer y muestra la alerta cuando el backend ya clasifico el lote como por_vencer', () => {
    const hoy = new Date();
    const enCincoDias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 5);
    const fechaVencimiento = `${enCincoDias.getFullYear()}-${String(enCincoDias.getMonth() + 1).padStart(2, '0')}-${String(enCincoDias.getDate()).padStart(2, '0')}`;

    const fixture = create(makeProducto());
    expectLotesRequest().flush({
      data: [makeLoteDto({ estado: 'por_vencer', fecha_vencimiento: fechaVencimiento })],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.diasParaVencer).toBe(5);
    expect(fila.estado).toBe('por_vencer');
  });

  it('parses fecha_produccion/fecha_vencimiento even when the backend sends a full datetime instead of a plain date', () => {
    const fixture = create(makeProducto());

    expectLotesRequest().flush({
      data: [
        makeLoteDto({
          fecha_produccion: '2026-09-10T00:00:00.000Z',
          fecha_vencimiento: '2026-12-10T00:00:00.000Z',
        }),
      ],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    expect(fixture.componentInstance.errorLotes()).toBe(false);
    const [fila] = fixture.componentInstance.lotes();
    expect(fila.fechaProduccionMostrada).toContain('2026');
    expect(fila.fechaVencimientoMostrada).toContain('2026');
  });

  it('does not flag a vencido lote as about to expire (ya paso, no es una alerta de proximidad)', () => {
    const fixture = create(makeProducto());

    expectLotesRequest().flush({
      data: [makeLoteDto({ estado: 'vencido', fecha_vencimiento: '2026-01-01' })],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.diasParaVencer).toBeNull();
  });

  it('shows an error state with retry when the lotes request fails', () => {
    const fixture = create(makeProducto());

    expectLotesRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.errorLotes()).toBe(true);

    fixture.componentInstance.cargarLotes(makeProducto());
    expectLotesRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    expect(fixture.componentInstance.errorLotes()).toBe(false);
  });

  it('cancels a pending lotes request when a newer one starts, so a late/stale response cannot win the race', () => {
    const fixture = createConLotes(makeProducto());
    const component = fixture.componentInstance;

    component.cargarLotes(makeProducto());
    component.cargarLotes(makeProducto());

    const pendientes = httpMock.match(
      (request) =>
        request.url === LOTES_BASE && request.params.get('producto_terminado_id') === '256',
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

  function expectMovimientosRequest() {
    return httpMock.expectOne(
      (request) =>
        request.url === MOVIMIENTOS_BASE && request.params.get('producto_terminado_id') === '256',
    );
  }

  it('does not request movimientos until the historial tab is opened', () => {
    createConLotes(makeProducto());

    httpMock.expectNone(
      (request) =>
        request.url === MOVIMIENTOS_BASE && request.params.get('producto_terminado_id') === '256',
    );
  });

  it('requests y mapea el historial de movimientos al abrir la pestaña, resolviendo signo y lote', () => {
    const fixture = createConLotes(makeProducto());
    const component = fixture.componentInstance;

    component.cambiarTab('historial');
    fixture.detectChanges();
    expectMovimientosRequest().flush({
      data: [
        makeMovimientoDto({ tipo: 'entrada', cantidad: 100 }),
        makeMovimientoDto({
          id: 2,
          codigo: 'FR-MVP-002-261022-PT256',
          tipo: 'salida',
          cantidad: 20,
        }),
        makeMovimientoDto({
          id: 3,
          codigo: 'FR-MVP-003-261022-PT256',
          tipo: 'ajuste',
          cantidad: -15,
        }),
      ],
      meta: { total: 3, page: 1, limit: 50, total_pages: 1 },
    });

    const [entrada, salida, ajuste] = component.movimientos();
    expect(entrada).toMatchObject({
      cantidad: 100,
      cantidadMostrada: '+100 unid.',
      loteCodigo: 'FR-LTP-001-261001-PT256',
    });
    expect(salida).toMatchObject({ cantidad: -20, cantidadMostrada: '-20 unid.' });
    expect(ajuste).toMatchObject({ cantidad: -15, cantidadMostrada: '-15 unid.' });
  });

  it('does not re-request movimientos when re-entering the historial tab for the same producto', () => {
    const fixture = createConLotes(makeProducto());
    const component = fixture.componentInstance;

    component.cambiarTab('historial');
    fixture.detectChanges();
    expectMovimientosRequest().flush({
      data: [makeMovimientoDto()],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    component.cambiarTab('informacion');
    fixture.detectChanges();
    component.cambiarTab('historial');
    fixture.detectChanges();

    httpMock.expectNone(
      (request) =>
        request.url === MOVIMIENTOS_BASE && request.params.get('producto_terminado_id') === '256',
    );
  });

  it('shows an error state with retry when the movimientos request fails', () => {
    const fixture = createConLotes(makeProducto());
    const component = fixture.componentInstance;

    component.cambiarTab('historial');
    fixture.detectChanges();
    expectMovimientosRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.errorMovimientos()).toBe(true);

    component.cargarMovimientos(makeProducto());
    expectMovimientosRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    expect(component.errorMovimientos()).toBe(false);
  });
});
