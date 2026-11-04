import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucidePackageCheck } from '@lucide/angular';
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
        lote_creado: false,
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

  it('builds campos y filas desde el detalle, con "Lote" como ultima columna', () => {
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
      loteCreado: false,
    });
    expect(fixture.componentInstance.columnas().map((c) => c.key)).toEqual([
      'productoNombre',
      'presentacionMostrada',
      'cantidadSolicitadaMostrada',
      'loteCreado',
    ]);
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

  describe('modo="entregar"', () => {
    function createEntregar(): ComponentFixture<SolicitudDetalleModal> {
      const fixture = TestBed.createComponent(SolicitudDetalleModal);
      fixture.componentRef.setInput('modo', 'entregar');
      fixture.detectChanges();
      return fixture;
    }

    function abrir(
      fixture: ComponentFixture<SolicitudDetalleModal>,
      solicitudDto: SolicitudProduccionDto = makeSolicitudDto({
        estado: 'en_proceso',
        detalle: makeSolicitudDto().detalle!.map((item) => ({ ...item, lote_creado: true })),
      }),
    ): void {
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(solicitudDto);
      fixture.detectChanges();
    }

    it('does not request the product catalog (no "Stock actual" aca)', () => {
      const fixture = createEntregar();
      abrir(fixture);

      expect(fixture.componentInstance.columnas().map((c) => c.key)).not.toContain(
        'stockActualMostrado',
      );
    });

    it('uses the PackageCheck icon as headerIcon', () => {
      const fixture = createEntregar();
      abrir(fixture);

      expect(fixture.componentInstance.headerIcon()).toBe(LucidePackageCheck);
    });

    it('blocks delivery while a requested product has no lote', () => {
      const fixture = createEntregar();
      abrir(fixture, makeSolicitudDto({ estado: 'en_proceso' }));

      expect(fixture.componentInstance.faltanLotes()).toBe(true);
      fixture.componentInstance.registrarEntrega();
      httpMock.expectNone(`${SOLICITUDES_BASE}/10/estado`);
      expect(fixture.componentInstance.registrando()).toBe(false);
    });

    it('registrarEntrega hace PATCH .../estado a "entregado" y emite entregaRegistrada + closed', () => {
      const fixture = createEntregar();
      abrir(fixture);
      const component = fixture.componentInstance;

      let entregado = 0;
      let cerrado = 0;
      component.entregaRegistrada.subscribe(() => entregado++);
      component.closed.subscribe(() => cerrado++);

      component.registrarEntrega();
      expect(component.registrando()).toBe(true);

      const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estado: 'entregado' });
      req.flush({});

      expect(component.registrando()).toBe(false);
      expect(entregado).toBe(1);
      expect(cerrado).toBe(1);
    });

    it('shows a generic error on failure sin cerrar el modal', () => {
      const fixture = createEntregar();
      abrir(fixture);
      const component = fixture.componentInstance;

      component.registrarEntrega();
      httpMock
        .expectOne(`${SOLICITUDES_BASE}/10/estado`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(component.errorEntrega()).toBe('No se pudo registrar la entrega. Intenta nuevamente.');
      expect(component.solicitud()).not.toBeNull();
    });

    it('closes and emits entregaRegistrada on a 409 (ya cambio de estado)', () => {
      const fixture = createEntregar();
      abrir(fixture);
      const component = fixture.componentInstance;

      let entregado = 0;
      component.entregaRegistrada.subscribe(() => entregado++);

      component.registrarEntrega();
      httpMock
        .expectOne(`${SOLICITUDES_BASE}/10/estado`)
        .flush('conflict', { status: 409, statusText: 'Conflict' });

      expect(entregado).toBe(1);
      expect(component.solicitud()).toBeNull();
    });
  });
});
