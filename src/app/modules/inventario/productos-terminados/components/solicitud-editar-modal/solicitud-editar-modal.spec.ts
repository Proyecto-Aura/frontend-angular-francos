import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { SolicitudProduccionDto } from '../../interfaces/solicitud-produccion-dto.interface';
import { SolicitudEditarModal } from './solicitud-editar-modal';

const SOLICITUDES_BASE = `${environment.apiUrl}/solicitudes-produccion`;
const PRODUCTOS_BASE = `${environment.apiUrl}/producto-presentaciones`;

function makeSolicitudDto(overrides: Partial<SolicitudProduccionDto> = {}): SolicitudProduccionDto {
  return {
    id: 10,
    codigo: 'FR-SPR-001-261026',
    estado: 'pendiente',
    fecha_creacion: '2026-10-26',
    fecha_limite: '2026-10-30',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-10-26T00:00:00.000Z',
    updated_at: '2026-10-26T00:00:00.000Z',
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
        created_at: '2026-10-26T00:00:00.000Z',
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
    producto_terminado: { id: 256, stock_actual: 30, stock_minimo: 10, stock_maximo: null },
    ...overrides,
  };
}

describe('SolicitudEditarModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<SolicitudEditarModal> {
    const fixture = TestBed.createComponent(SolicitudEditarModal);
    fixture.detectChanges();
    return fixture;
  }

  function abrir(
    fixture: ComponentFixture<SolicitudEditarModal>,
    solicitudDto: SolicitudProduccionDto = makeSolicitudDto(),
    productos: ProductoPresentacionDto[] = [makeProductoDto()],
  ): void {
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

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

  it('prefills codigo (desactivado), fecha de solicitud y las filas desde la solicitud cargada', () => {
    const fixture = create();
    abrir(fixture);

    const c = fixture.componentInstance;
    expect(c.codigo()).toBe('FR-SPR-001-261026');
    expect(c.fechaLimite()).toBe('2026-10-30');
    expect(c.filas()).toEqual([
      {
        id: 1,
        detalleId: 1,
        productoTerminadoId: '256',
        cantidadSolicitada: '12',
        cantidadOriginal: '12',
      },
    ]);
  });

  it('muestra la fecha ISO guardada en el calendario y no envía cambios si no se edita', () => {
    const fixture = create();
    abrir(fixture, makeSolicitudDto({ fecha_limite: '2026-11-13T00:00:00.000Z' }));

    expect(fixture.componentInstance.fechaLimite()).toBe('2026-11-13');
    const calendario = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input#solicitud-editar-fecha-limite',
    );
    expect(calendario?.value).toBe('2026-11-13');

    fixture.componentInstance.guardar();
    httpMock.expectNone(`${SOLICITUDES_BASE}/10`);
  });

  it('shows an error state with retry when loading fails', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    // forkJoin cancela la peticion hermana apenas una de las dos falla — no
    // se puede flushear, solo confirmar que quedo cancelada.
    expect(httpMock.expectOne((r) => r.url === PRODUCTOS_BASE).cancelled).toBe(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
  });

  it('validates antes de guardar: fecha limite vacia no dispara ningun HTTP call', () => {
    const fixture = create();
    abrir(fixture);

    fixture.componentInstance.fechaLimite.set('');
    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errores().fechaLimite).toBeTruthy();
    httpMock.expectNone(`${SOLICITUDES_BASE}/10`);
  });

  it('closes without ningun HTTP call cuando no hay cambios', () => {
    const fixture = create();
    abrir(fixture);

    let cerrado = false;
    let guardadoEmitido = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.saved.subscribe(() => (guardadoEmitido = true));

    fixture.componentInstance.guardar();

    expect(cerrado).toBe(true);
    expect(guardadoEmitido).toBe(false);
  });

  it('sends solo PATCH de fecha_limite cuando solo eso cambio', () => {
    const fixture = create();
    abrir(fixture);

    fixture.componentInstance.fechaLimite.set('2026-11-05');
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fecha_limite: '2026-11-05' });
    req.flush({});

    expect(fixture.componentInstance.guardando()).toBe(false);
  });

  it('sends PATCH de cantidad cuando se edita una fila existente', () => {
    const fixture = create();
    abrir(fixture);

    fixture.componentInstance.actualizarCantidadDeFila(1, '50');
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/detalle/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cantidad_solicitada: 50 });
    req.flush({});
  });

  it('sends POST de alta cuando se agrega un producto nuevo', () => {
    const fixture = create();
    abrir(fixture);

    fixture.componentInstance.agregarFila();
    const [, nueva] = fixture.componentInstance.filas();
    fixture.componentInstance.seleccionarProductoDeFila(nueva.id, '300');
    fixture.componentInstance.actualizarCantidadDeFila(nueva.id, '8');
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/detalle`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ producto_terminado_id: 300, cantidad_solicitada: 8 });
    req.flush({});
  });

  it('sends DELETE de baja cuando se quita una fila existente', () => {
    const fixture = create();
    abrir(
      fixture,
      makeSolicitudDto({
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
            created_at: '2026-10-26T00:00:00.000Z',
          },
          {
            id: 2,
            solicitud_produccion_id: 10,
            producto_terminado_id: 300,
            sku: 'FR-P4-PR1',
            producto_id: 4,
            producto_nombre: 'Yuca frita',
            categoria_id: 2,
            categoria_nombre: 'Snacks',
            presentacion_id: 2,
            presentacion_cantidad: 120,
            presentacion_unidad_medida: 'gr',
            cantidad_solicitada: 5,
            created_at: '2026-10-26T00:00:00.000Z',
          },
        ],
      }),
    );

    const [, segunda] = fixture.componentInstance.filas();
    fixture.componentInstance.quitarFila(segunda.id);
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/detalle/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('shows a 409-specific error (la solicitud ya cambio de estado) sin cerrar el modal', () => {
    const fixture = create();
    abrir(fixture);

    fixture.componentInstance.fechaLimite.set('2026-11-05');
    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.guardar();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush({ message: 'conflict' }, { status: 409, statusText: 'Conflict' });

    expect(cerrado).toBe(false);
    expect(fixture.componentInstance.errorGeneral()).toContain('ya cambió de estado');
  });

  it('emits closed y limpia su estado en cerrar()', () => {
    const fixture = create();
    abrir(fixture);

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(true);
    expect(fixture.componentInstance.filas()).toEqual([]);
    expect(fixture.componentInstance.codigo()).toBe('');
  });
});
