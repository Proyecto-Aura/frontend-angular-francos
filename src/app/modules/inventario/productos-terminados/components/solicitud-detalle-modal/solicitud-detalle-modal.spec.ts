import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { SolicitudProduccionDto } from '../../interfaces/solicitud-produccion-dto.interface';
import { SolicitudDetalleModal } from './solicitud-detalle-modal';

const SOLICITUDES_BASE = `${environment.apiUrl}/solicitudes-produccion`;
const PRODUCTOS_BASE = `${environment.apiUrl}/producto-presentaciones`;

function makeSolicitudDto(overrides: Partial<SolicitudProduccionDto> = {}): SolicitudProduccionDto {
  return {
    id: 10,
    codigo: 'SPR-0090',
    estado: 'pendiente',
    fecha_creacion: '2026-09-12T08:35:00.000Z',
    fecha_limite: '2026-09-13',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-09-12T08:35:00.000Z',
    updated_at: '2026-09-12T08:35:00.000Z',
    detalle: [
      {
        id: 1,
        solicitud_produccion_id: 10,
        producto_terminado_id: 256,
        sku: 'FR-P3-PR2',
        producto_id: 3,
        producto_nombre: 'Camote frito',
        categoria_id: 2,
        categoria_nombre: 'Snacks',
        presentacion_id: 2,
        presentacion_cantidad: 120,
        presentacion_unidad_medida: 'gr',
        cantidad_solicitada: 12,
        created_at: '2026-09-12T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

function makeProductoDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 2,
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
    presentacion: { id: 2, cantidad: 120, unidad_medida: 'gr' },
    producto_terminado: { id: 256, stock_actual: 0, stock_minimo: 10, stock_maximo: null },
    ...overrides,
  };
}

describe('SolicitudDetalleModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<SolicitudDetalleModal> {
    const fixture = TestBed.createComponent(SolicitudDetalleModal);
    fixture.detectChanges();
    return fixture;
  }

  function flushCarga(
    fixture: ComponentFixture<SolicitudDetalleModal>,
    solicitudDto: SolicitudProduccionDto = makeSolicitudDto(),
    productos: ProductoPresentacionDto[] = [makeProductoDto()],
  ): void {
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(solicitudDto);
    httpMock
      .expectOne((r) => r.url === PRODUCTOS_BASE)
      .flush({
        data: productos,
        meta: { total: productos.length, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();
  }

  it('does not request anything while closed (solicitudId null)', () => {
    create();
    httpMock.expectNone(`${SOLICITUDES_BASE}/10`);
  });

  it('requests the solicitud and the product catalog when solicitudId is set', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    flushCarga(fixture);

    expect(fixture.componentInstance.solicitud()?.codigo).toBe('SPR-0090');
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('builds the info fields, including fecha solicitud con hora', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(fixture);

    const campos = fixture.componentInstance.campos();
    expect(campos).toContainEqual({ label: 'Solicitud', value: 'SPR-0090' });
    expect(campos).toContainEqual({ label: 'Solicitante', value: 'M. Quispe' });
    const fechaSolicitud = campos.find((c) => c.label === 'Fecha solicitud');
    expect(fechaSolicitud?.value).toContain('·');
  });

  it('shows — para fecha limite cuando viene null', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(fixture, makeSolicitudDto({ fecha_limite: null }));

    const campos = fixture.componentInstance.campos();
    expect(campos.find((c) => c.label === 'Fecha límite')?.value).toBe('—');
  });

  it('resolves stock actual de cada linea uniendo contra el catalogo por productoTerminadoId', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(fixture);

    const [fila] = fixture.componentInstance.filas();
    expect(fila).toMatchObject({
      productoNombre: 'Camote frito',
      sku: 'FR-P3-PR2',
      presentacionMostrada: '120 gr',
      stockActualMostrado: '0 unid.',
      cantidadSolicitadaMostrada: '12 unid.',
      cantidadSolicitada: 12,
      stockInsuficiente: true,
    });
  });

  it('shows — para el stock cuando el producto no esta en el catalogo cargado', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(fixture, makeSolicitudDto(), []);

    const [fila] = fixture.componentInstance.filas();
    expect(fila.stockActualMostrado).toBe('—');
    expect(fila.stockInsuficiente).toBe(false);
  });

  it('shows an error state with retry when the request fails', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    expect(httpMock.expectOne((r) => r.url === PRODUCTOS_BASE).cancelled).toBe(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
  });

  it('emits closed and clears its state on cerrar()', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(fixture);

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(true);
    expect(fixture.componentInstance.solicitud()).toBeNull();
  });

  it('retries the same solicitudId on reintentar()', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    expect(httpMock.expectOne((r) => r.url === PRODUCTOS_BASE).cancelled).toBe(true);
    fixture.detectChanges();

    fixture.componentInstance.reintentar();
    flushCarga(fixture);

    expect(fixture.componentInstance.error()).toBe(false);
    expect(fixture.componentInstance.solicitud()?.codigo).toBe('SPR-0090');
  });
});
