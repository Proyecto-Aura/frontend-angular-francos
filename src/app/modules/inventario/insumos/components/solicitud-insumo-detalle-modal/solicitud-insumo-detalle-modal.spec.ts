import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucidePackageCheck } from '@lucide/angular';
import { environment } from '../../../../../../environments/environment';
import { SolicitudInsumoDto } from '../../interfaces/solicitud-insumo-dto.interface';
import { SolicitudInsumoDetalleModal } from './solicitud-insumo-detalle-modal';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-001-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04T19:30:00.000Z',
    fecha_limite: '2026-11-05',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-11-04T19:30:00.000Z',
    updated_at: '2026-11-04T19:30:00.000Z',
    detalle: [
      {
        id: 1,
        insumo_id: 50,
        insumo_sku: 'INS-050',
        insumo_nombre: 'Harina de camote',
        insumo_unidad_medida: 'kg',
        stock_disponible: 35,
        cantidad_solicitada: 20,
        created_at: '2026-11-04T19:30:00.000Z',
      },
    ],
    disponibilidad: 'completo',
    ...overrides,
  };
}

describe('SolicitudInsumoDetalleModal (Inventario)', () => {
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

  function flushCarga(solicitudDto: SolicitudInsumoDto = makeSolicitudDto()): void {
    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(solicitudDto);
  }

  it('does not request anything while closed (solicitudId null)', () => {
    create();
    httpMock.expectNone(`${SOLICITUDES_BASE}/10`);
  });

  it('requests la solicitud cuando solicitudId cambia', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();

    flushCarga();
    fixture.detectChanges();

    expect(fixture.componentInstance.solicitud()?.codigo).toBe('FR-SIN-001-261104');
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('builds campos y filas desde el detalle, con el stock_disponible que ya manda el backend', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga();
    fixture.detectChanges();

    const campos = fixture.componentInstance.campos();
    expect(campos).toContainEqual({ label: 'Solicitante', value: 'M. Quispe' });
    const [fila] = fixture.componentInstance.filas();
    expect(fila).toMatchObject({
      insumoNombre: 'Harina de camote',
      sku: 'INS-050',
      unidadMedida: 'kg',
      stockDisponible: 35,
      stockDisponibleMostrado: '35 kg',
      cantidadSolicitadaMostrada: '20 kg',
    });
  });

  it('shows — para stock disponible cuando el backend no lo manda', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(
      makeSolicitudDto({
        detalle: [
          {
            id: 1,
            insumo_id: 50,
            insumo_sku: 'INS-050',
            insumo_nombre: 'Harina de camote',
            insumo_unidad_medida: 'kg',
            cantidad_solicitada: 20,
            created_at: '2026-11-04T19:30:00.000Z',
          },
        ],
      }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.filas()[0].stockDisponibleMostrado).toBe('—');
  });

  describe('badges de disponibilidad (modo="ver")', () => {
    it('no incluye la columna "cantidadPreparada" en modo="ver"', () => {
      const fixture = create();
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      flushCarga();
      fixture.detectChanges();

      expect(fixture.componentInstance.columnas().map((c) => c.key)).not.toContain(
        'cantidadPreparada',
      );
      expect(fixture.componentInstance.textoAyuda()).toBeNull();
    });

    it('shows el badge "Disponibilidad" de la solicitud (completo/parcial/sin_stock)', () => {
      const fixture = create();
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      flushCarga(makeSolicitudDto({ disponibilidad: 'parcial' }));
      fixture.detectChanges();

      expect(fixture.componentInstance.mostrarDisponibilidad()).toBe(true);
      expect(fixture.componentInstance.disponibilidadLabel()).toBe('Stock parcial');
      expect(fixture.componentInstance.disponibilidadTono()).toBe('warning');
    });

    it('no muestra el badge "Disponibilidad" una vez que la solicitud ya esta entregada', () => {
      const fixture = create();
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      flushCarga(makeSolicitudDto({ estado: 'entregado', disponibilidad: 'completo' }));
      fixture.detectChanges();

      expect(fixture.componentInstance.mostrarDisponibilidad()).toBe(false);
    });

    it('marca una fila como "Stock completo" cuando el stock disponible alcanza lo solicitado', () => {
      const fixture = create();
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      flushCarga();
      fixture.detectChanges();

      const [fila] = fixture.componentInstance.filas();
      expect(fixture.componentInstance.disponibilidadFilaEstado(fila)).toBe('Stock completo');
      expect(fixture.componentInstance.disponibilidadFilaTono(fila)).toBe('success');
    });

    it('marca una fila como "Stock insuficiente" cuando el stock disponible no alcanza lo solicitado', () => {
      const fixture = create();
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      flushCarga(
        makeSolicitudDto({
          detalle: [
            {
              id: 1,
              insumo_id: 50,
              insumo_sku: 'INS-050',
              insumo_nombre: 'Harina de camote',
              insumo_unidad_medida: 'kg',
              stock_disponible: 10,
              cantidad_solicitada: 20,
              created_at: '2026-11-04T19:30:00.000Z',
            },
          ],
          disponibilidad: 'sin_stock',
        }),
      );
      fixture.detectChanges();

      const [fila] = fixture.componentInstance.filas();
      expect(fixture.componentInstance.disponibilidadFilaEstado(fila)).toBe('Stock insuficiente');
      expect(fixture.componentInstance.disponibilidadFilaTono(fila)).toBe('danger');
    });
  });

  it('shows — para fecha limite cuando viene null', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga(makeSolicitudDto({ fecha_limite: null }));
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
    fixture.componentInstance.reintentar();
    flushCarga();
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(false);
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.componentInstance.solicitud()?.id).toBe(10);
  });

  it('emits closed and clears its state on cerrar()', () => {
    const fixture = create();
    fixture.componentRef.setInput('solicitudId', 10);
    fixture.detectChanges();
    flushCarga();
    fixture.detectChanges();

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(true);
    expect(fixture.componentInstance.solicitud()).toBeNull();
  });

  describe('modo="entregar"', () => {
    function createEntregar(): ComponentFixture<SolicitudInsumoDetalleModal> {
      const fixture = TestBed.createComponent(SolicitudInsumoDetalleModal);
      fixture.componentRef.setInput('modo', 'entregar');
      fixture.detectChanges();
      return fixture;
    }

    function abrir(
      fixture: ComponentFixture<SolicitudInsumoDetalleModal>,
      solicitudDto: SolicitudInsumoDto = makeSolicitudDto({ estado: 'en_proceso' }),
    ): void {
      fixture.componentRef.setInput('solicitudId', 10);
      fixture.detectChanges();
      flushCarga(solicitudDto);
      fixture.detectChanges();
    }

    it('uses the PackageCheck icon as headerIcon', () => {
      const fixture = createEntregar();
      abrir(fixture);

      expect(fixture.componentInstance.headerIcon()).toBe(LucidePackageCheck);
    });

    it('incluye las columnas "stockDisponibleMostrado" y "cantidadPreparada", y el texto de ayuda', () => {
      const fixture = createEntregar();
      abrir(fixture);

      const keys = fixture.componentInstance.columnas().map((c) => c.key);
      expect(keys).toContain('stockDisponibleMostrado');
      expect(keys).toContain('cantidadPreparada');
      expect(fixture.componentInstance.textoAyuda()).toBe(
        'Ajusta la cantidad preparada si es distinta a la solicitada. Al confirmar se registrará la salida de inventario.',
      );
    });

    it('prellena cantidadPreparada con la cantidad solicitada de cada linea', () => {
      const fixture = createEntregar();
      abrir(fixture);

      expect(fixture.componentInstance.filas()[0].cantidadPreparada).toBe(20);
    });

    it.each(['parcial', 'sin_stock'] as const)(
      'entregaBloqueada es true y el texto de ayuda avisa cuando la disponibilidad es %s',
      (disponibilidad) => {
        const fixture = createEntregar();
        abrir(fixture, makeSolicitudDto({ estado: 'en_proceso', disponibilidad }));

        expect(fixture.componentInstance.entregaBloqueada()).toBe(true);
        expect(fixture.componentInstance.textoAyuda()).toBe(
          'No se puede registrar la entrega: falta stock para completar la solicitud.',
        );
      },
    );

    it('entregaBloqueada es false cuando la disponibilidad es completo', () => {
      const fixture = createEntregar();
      abrir(fixture);

      expect(fixture.componentInstance.entregaBloqueada()).toBe(false);
    });

    it.each(['parcial', 'sin_stock'] as const)(
      'registrarEntrega no hace nada cuando la disponibilidad es %s',
      (disponibilidad) => {
        const fixture = createEntregar();
        abrir(fixture, makeSolicitudDto({ estado: 'en_proceso', disponibilidad }));

        fixture.componentInstance.registrarEntrega();

        httpMock.expectNone(`${SOLICITUDES_BASE}/10/estado`);
        expect(fixture.componentInstance.registrando()).toBe(false);
      },
    );

    it('registrarEntrega hace PATCH .../estado a "entregado" mandando items con la cantidad solicitada por defecto, y emite entregaRegistrada + closed', () => {
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
      expect(req.request.body).toEqual({
        estado: 'entregado',
        items: [{ insumo_id: 50, cantidad_entregada: 20 }],
      });
      req.flush({});

      expect(component.registrando()).toBe(false);
      expect(entregado).toBe(1);
      expect(cerrado).toBe(1);
    });

    it('registrarEntrega manda la cantidad preparada editada, no la solicitada original', () => {
      const fixture = createEntregar();
      abrir(fixture);
      const component = fixture.componentInstance;

      component.actualizarCantidadPreparada(1, '18');
      component.registrarEntrega();

      const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
      expect(req.request.body).toEqual({
        estado: 'entregado',
        items: [{ insumo_id: 50, cantidad_entregada: 18 }],
      });
      req.flush({});
    });

    it('shows a specific error on 400 (cantidades que no coinciden con el detalle) sin cerrar el modal', () => {
      const fixture = createEntregar();
      abrir(fixture);
      const component = fixture.componentInstance;

      component.registrarEntrega();
      httpMock
        .expectOne(`${SOLICITUDES_BASE}/10/estado`)
        .flush('bad request', { status: 400, statusText: 'Bad Request' });

      expect(component.errorEntrega()).toBe(
        'Las cantidades entregadas no coinciden con las líneas del detalle.',
      );
      expect(component.solicitud()).not.toBeNull();
    });

    it('shows a specific error on 409 (stock insuficiente) sin cerrar el modal', () => {
      const fixture = createEntregar();
      abrir(fixture);
      const component = fixture.componentInstance;

      let entregado = 0;
      component.entregaRegistrada.subscribe(() => entregado++);

      component.registrarEntrega();
      httpMock
        .expectOne(`${SOLICITUDES_BASE}/10/estado`)
        .flush('conflict', { status: 409, statusText: 'Conflict' });

      expect(component.errorEntrega()).toBe(
        'No hay stock suficiente para entregar uno o más insumos de esta solicitud.',
      );
      expect(entregado).toBe(0);
      expect(component.solicitud()).not.toBeNull();
    });

    it('shows a generic error on other failures sin cerrar el modal', () => {
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
  });
});
