import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { InsumoDto } from '../../interfaces/insumo-dto.interface';
import { SolicitudInsumoDto } from '../../interfaces/solicitud-insumo-dto.interface';
import { SolicitudInsumoEditarModal } from './solicitud-insumo-editar-modal';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;
const INSUMOS_BASE = `${environment.apiUrl}/insumos`;
const SOLICITUDES_PRODUCCION_BASE = `${environment.apiUrl}/produccion/solicitudes`;

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-001-261026',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-10-26',
    fecha_limite: '2026-10-30',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'Admin Sistema',
    created_at: '2026-10-26T00:00:00.000Z',
    updated_at: '2026-10-26T00:00:00.000Z',
    detalle: [
      {
        id: 1,
        insumo_id: 12,
        insumo_sku: 'FR-INS-012',
        insumo_nombre: 'Harina de trigo',
        insumo_unidad_medida: 'kg',
        cantidad_solicitada: 50,
        created_at: '2026-10-26T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 12,
    sku: 'FR-INS-012',
    nombre: 'Harina de trigo',
    unidad_medida: 'kg',
    stock_actual: 45,
    stock_minimo: 10,
    ...overrides,
  };
}

describe('SolicitudInsumoEditarModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<SolicitudInsumoEditarModal> {
    const fixture = TestBed.createComponent(SolicitudInsumoEditarModal);
    fixture.detectChanges();
    return fixture;
  }

  function abrir(
    fixture: ComponentFixture<SolicitudInsumoEditarModal>,
    solicitudDto: SolicitudInsumoDto = makeSolicitudDto(),
    insumos: InsumoDto[] = [makeInsumoDto()],
    solicitudesProduccion: { id: number; codigo: string; estado: string }[] = [],
  ): void {
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(solicitudDto);
    httpMock
      .expectOne((r) => r.url === INSUMOS_BASE)
      .flush({
        data: insumos,
        meta: { total: insumos.length, page: 1, limit: 100, total_pages: 1 },
      });
    httpMock
      .expectOne((r) => r.url === SOLICITUDES_PRODUCCION_BASE)
      .flush({
        data: solicitudesProduccion,
        meta: { total: solicitudesProduccion.length, page: 1, limit: 100, total_pages: 1 },
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
    expect(c.codigo()).toBe('FR-SIN-001-261026');
    expect(c.fechaLimite()).toBe('2026-10-30');
    expect(c.filas()).toEqual([
      { id: 1, detalleId: 1, insumoId: '12', cantidadSolicitada: '50', cantidadOriginal: '50' },
    ]);
    expect(c.solicitudProduccionCodigo()).toBe('—');
  });

  it('resolves el codigo de la solicitud de produccion vinculada, si hay', () => {
    const fixture = create();
    abrir(
      fixture,
      makeSolicitudDto({ solicitud_produccion_id: 6 }),
      [makeInsumoDto()],
      [{ id: 6, codigo: 'FR-SPR-001-261104', estado: 'en_proceso' }],
    );

    expect(fixture.componentInstance.solicitudProduccionCodigo()).toBe('FR-SPR-001-261104');
  });

  it('shows an error state with retry when loading fails', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    // forkJoin cancela las peticiones hermanas apenas una de las tres falla
    // — no se pueden flushear, solo confirmar que quedaron canceladas.
    expect(httpMock.expectOne((r) => r.url === INSUMOS_BASE).cancelled).toBe(true);
    expect(httpMock.expectOne((r) => r.url === SOLICITUDES_PRODUCCION_BASE).cancelled).toBe(true);
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

    fixture.componentInstance.actualizarCantidadDeFila(1, '80');
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/detalle/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cantidad_solicitada: 80 });
    req.flush({});
  });

  it('sends POST de alta cuando se agrega un insumo nuevo', () => {
    const fixture = create();
    abrir(fixture);

    fixture.componentInstance.agregarFila();
    const [, nueva] = fixture.componentInstance.filas();
    fixture.componentInstance.seleccionarInsumoDeFila(nueva.id, '13');
    fixture.componentInstance.actualizarCantidadDeFila(nueva.id, '8');
    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/detalle`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ insumo_id: 13, cantidad_solicitada: 8 });
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
            insumo_id: 12,
            insumo_sku: 'FR-INS-012',
            insumo_nombre: 'Harina de trigo',
            insumo_unidad_medida: 'kg',
            cantidad_solicitada: 50,
            created_at: '2026-10-26T00:00:00.000Z',
          },
          {
            id: 2,
            insumo_id: 13,
            insumo_sku: 'FR-INS-013',
            insumo_nombre: 'Azucar',
            insumo_unidad_medida: 'kg',
            cantidad_solicitada: 10,
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
