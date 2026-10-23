import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { IniciativaDto } from '../interfaces/iniciativa-dto.interface';
import { IniciativaForm } from '../interfaces/iniciativa.interface';
import { IniciativaService } from './iniciativa.service';

const BASE_URL = `${environment.apiUrl}/iniciativas`;

function makeDto(): IniciativaDto {
  return {
    id: 10,
    codigo: 'INI-001',
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

describe('IniciativaService', () => {
  let service: IniciativaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IniciativaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists and maps initiatives for a plan', () => {
    let result: unknown;
    service.listarPorPlan(5).subscribe((value) => (result = value));
    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/iniciativas`);
    expect(req.request.method).toBe('GET');
    req.flush([makeDto()]);
    expect(result).toEqual([expect.objectContaining({ id: 10, fechaInicio: '2026-01-15' })]);
  });

  it('creates an initiative with the mapped request', () => {
    service.crear(makeForm()).subscribe();
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ objetivo_estrategico_id: 20, presupuesto: 15000 });
    req.flush(makeDto());
  });

  it('updates an initiative with the mapped request', () => {
    service.actualizar(10, makeForm()).subscribe();
    const req = httpMock.expectOne(`${BASE_URL}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toMatchObject({ objetivo_estrategico_id: 20, presupuesto: 15000 });
    req.flush(makeDto());
  });

  it('cancels with a trimmed cancellation reason', () => {
    service.cambiarEstado(10, 'CANCELADA', '  Cambio de prioridad  ').subscribe();
    const req = httpMock.expectOne(`${BASE_URL}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      estado_codigo: 'CANCELADA',
      motivo_cancelacion: 'Cambio de prioridad',
    });
    req.flush(makeDto());
  });

  it.each(['EN_PROCESO', 'COMPLETADA'] as const)(
    'changes to %s without sending a cancellation reason',
    (estado) => {
      service.cambiarEstado(10, estado, 'No debe enviarse').subscribe();
      const req = httpMock.expectOne(`${BASE_URL}/10/estado`);
      expect(req.request.body).toEqual({ estado_codigo: estado });
      req.flush(makeDto());
    },
  );

  it('deletes an initiative and resolves the response', () => {
    let result: unknown = 'pending';
    service.eliminar(10).subscribe((value) => (result = value));
    const req = httpMock.expectOne(`${BASE_URL}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(result).toBeNull();
  });
});
