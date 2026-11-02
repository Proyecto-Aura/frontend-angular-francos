import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SolicitudProduccionDto } from '../../interfaces/solicitud-produccion-dto.interface';
import { SolicitudDetalleModal } from './solicitud-detalle-modal';

const SOLICITUDES_BASE = `${environment.apiUrl}/solicitudes-produccion`;

function makeSolicitudDto(overrides: Partial<SolicitudProduccionDto> = {}): SolicitudProduccionDto {
  return {
    id: 10,
    codigo: 'FR-SPR-090-260912',
    estado: 'pendiente',
    fecha_creacion: '2026-09-12T09:05:00.000Z',
    fecha_limite: '2026-09-13',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-09-12T09:05:00.000Z',
    updated_at: '2026-09-12T09:05:00.000Z',
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
        presentacion_cantidad: 500,
        presentacion_unidad_medida: 'gr',
        cantidad_solicitada: 20,
        created_at: '2026-09-12T09:05:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('SolicitudDetalleModal (Produccion)', () => {
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

    expect(fixture.componentInstance.solicitud()?.codigo).toBe('FR-SPR-090-260912');
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('builds campos y filas desde el detalle', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto());
    fixture.detectChanges();

    const campos = fixture.componentInstance.campos();
    expect(campos).toContainEqual({ label: 'Solicitante', value: 'M. Quispe' });
    const [fila] = fixture.componentInstance.filas();
    expect(fila).toMatchObject({
      productoNombre: 'Camote frito',
      sku: 'FR-P3-PR2',
      presentacionMostrada: '500 gr',
      cantidadSolicitadaMostrada: '20 unid.',
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
