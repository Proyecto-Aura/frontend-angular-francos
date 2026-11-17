import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SolicitudInsumoDto } from '../../interfaces/solicitud-insumo-dto.interface';
import { SolicitudInsumoDetalleModal } from './solicitud-insumo-detalle-modal';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-090-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04T09:05:00.000Z',
    fecha_limite: '2026-11-15',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'Admin Sistema',
    created_at: '2026-11-04T09:05:00.000Z',
    updated_at: '2026-11-04T09:05:00.000Z',
    detalle: [
      {
        id: 1,
        insumo_id: 12,
        insumo_sku: 'FR-INS-012',
        insumo_nombre: 'Harina de trigo',
        insumo_unidad_medida: 'kg',
        cantidad_solicitada: 50,
        created_at: '2026-11-04T09:05:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('SolicitudInsumoDetalleModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<SolicitudInsumoDetalleModal> {
    const fixture = TestBed.createComponent(SolicitudInsumoDetalleModal);
    fixture.detectChanges();
    return fixture;
  }

  it('does not request anything while closed (solicitudId null)', () => {
    create();
    httpMock.expectNone(`${SOLICITUDES_BASE}/10`);
  });

  it('requests la solicitud cuando solicitudId cambia', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto());
    fixture.detectChanges();

    expect(fixture.componentInstance.solicitud()?.codigo).toBe('FR-SIN-090-261104');
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('builds campos y filas desde el detalle', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto());
    fixture.detectChanges();

    const campos = fixture.componentInstance.campos();
    expect(campos).toContainEqual({ label: 'Solicitante', value: 'Admin Sistema' });
    const [fila] = fixture.componentInstance.filas();
    expect(fila).toMatchObject({
      insumoNombre: 'Harina de trigo',
      sku: 'FR-INS-012',
      unidadMedidaMostrada: 'kg',
      cantidadSolicitadaMostrada: '50 kg',
    });
  });

  it('shows — para fecha limite cuando viene null', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto({ fecha_limite: null }));
    fixture.detectChanges();

    expect(fixture.componentInstance.campos()).toContainEqual({
      label: 'Fecha límite',
      value: '—',
    });
  });

  it('shows an error state with retry when the request fails', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
  });

  it('retries the same solicitudId on reintentar()', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    fixture.componentInstance.reintentar();
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto());
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(false);
    expect(fixture.componentInstance.solicitud()?.codigo).toBe('FR-SIN-090-261104');
  });

  it('emits closed and clears its state on cerrar()', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto());
    fixture.detectChanges();

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(true);
    expect(fixture.componentInstance.solicitud()).toBeNull();
  });
});
