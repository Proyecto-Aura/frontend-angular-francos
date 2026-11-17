import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { IniciativaDto } from '../../negocio/interfaces/iniciativa-dto.interface';
import { IniciativaForm } from '../../negocio/interfaces/iniciativa.interface';
import { IniciativaTiService } from './iniciativa-ti.service';

const BASE_URL = `${environment.apiUrl}/iniciativas-ti`;

function makeDto(): IniciativaDto {
  return {
    id: 10,
    codigo: 'PE-0005-INI-TI-001',
    nombre: 'Programa de fidelización',
    descripcion: null,
    responsable: 'Ana Torres',
    fecha_inicio: '2026-01-15T00:00:00.000Z',
    fecha_fin: '2027-12-20',
    presupuesto: 15000,
    motivo_cancelacion: null,
    estado: true,
    estado_iniciativa: { id: 1, codigo: 'PENDIENTE', nombre: 'Pendiente' },
    objetivo: {
      id: 20,
      nombre: 'Incrementar rentabilidad',
      perspectiva: { id: 1, nombre: 'Financiera' },
    },
  };
}

function makeForm(): IniciativaForm {
  return {
    nombre: 'Programa de fidelización',
    descripcion: '',
    objetivoId: 20,
    responsable: 'Ana Torres',
    fechaInicio: '2026-01-15',
    fechaFin: '2027-12-20',
    presupuesto: '15000',
  };
}

describe('IniciativaTiService', () => {
  let service: IniciativaTiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IniciativaTiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists and maps initiatives for a plan', () => {
    let result: unknown;
    service.listarPorPlan(5).subscribe((value) => (result = value));
    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/iniciativas-ti`);
    expect(req.request.method).toBe('GET');
    req.flush([makeDto()]);
    expect(result).toEqual([
      expect.objectContaining({
        id: 10,
        codigo: 'PE-0005-INI-TI-001',
        objetivoId: 20,
        fechaInicio: '2026-01-15',
        presupuesto: 15000,
        estadoCodigo: 'PENDIENTE',
      }),
    ]);
  });

  it('creates an initiative with the mapped request', () => {
    service.crear(makeForm()).subscribe();
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      objetivo_estrategico_id: 20,
      nombre: 'Programa de fidelización',
      responsable: 'Ana Torres',
      fecha_inicio: '2026-01-15',
      fecha_fin: '2027-12-20',
      presupuesto: 15000,
    });
    req.flush(makeDto());
  });

  it('updates an initiative with the mapped request', () => {
    service.actualizar(7, makeForm()).subscribe();
    const req = httpMock.expectOne(`${BASE_URL}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      objetivo_estrategico_id: 20,
      nombre: 'Programa de fidelización',
      descripcion: '',
      responsable: 'Ana Torres',
      fecha_inicio: '2026-01-15',
      fecha_fin: '2027-12-20',
      presupuesto: 15000,
    });
    req.flush(makeDto());
  });

  it('cancels with a trimmed cancellation reason', () => {
    service.cambiarEstado(7, 'CANCELADA', '  motivo  ').subscribe();
    const req = httpMock.expectOne(`${BASE_URL}/7/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      estado_codigo: 'CANCELADA',
      motivo_cancelacion: 'motivo',
    });
    req.flush(makeDto());
  });

  it.each(['EN_PROCESO', 'COMPLETADA'] as const)(
    'changes to %s without sending a cancellation reason',
    (estado) => {
      service.cambiarEstado(7, estado, 'No debe enviarse').subscribe();
      const req = httpMock.expectOne(`${BASE_URL}/7/estado`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estado_codigo: estado });
      req.flush(makeDto());
    },
  );

  it('deletes an initiative and resolves the response', () => {
    let result: unknown = 'pending';
    service.eliminar(7).subscribe((value) => (result = value));
    const req = httpMock.expectOne(`${BASE_URL}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(result).toBeNull();
  });

  it('propagates an HTTP error when listing initiatives', () => {
    const next = vi.fn();
    const error = vi.fn();
    service.listarPorPlan(5).subscribe({ next, error });
    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/iniciativas-ti`);
    req.flush({ message: 'Error interno' }, { status: 500, statusText: 'Server Error' });
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, error: { message: 'Error interno' } }),
    );
    expect(error.mock.calls[0][0]).toBeInstanceOf(HttpErrorResponse);
  });
});
