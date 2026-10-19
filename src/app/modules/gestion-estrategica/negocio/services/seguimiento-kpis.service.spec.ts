import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SeguimientoKpisDto } from '../interfaces/seguimiento-kpis-dto.interface';
import { SeguimientoKpisService } from './seguimiento-kpis.service';

function makeDto(): SeguimientoKpisDto {
  const cumplimiento = {
    porcentaje_promedio: null,
    kpis_evaluados: 0,
    total_kpis: 0,
    kpis_verde: 0,
    kpis_amarillo: 0,
    kpis_rojo: 0,
    kpis_sin_dato: 0,
  };
  return {
    plan: { id: 5, codigo: 'PE-0005', nombre: 'Plan institucional' },
    cumplimiento_general: cumplimiento,
    perspectivas: [{ id: 1, nombre: 'Financiera', cumplimiento, objetivos: [] }],
  };
}

describe('SeguimientoKpisService', () => {
  let service: SeguimientoKpisService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeguimientoKpisService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets and maps KPI tracking for a plan', () => {
    let result: unknown;
    service.obtener(5).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/seguimiento-kpis`);
    expect(req.request.method).toBe('GET');
    req.flush(makeDto());

    expect(result).toEqual(
      expect.objectContaining({
        planId: 5,
        planNombre: 'Plan institucional',
        cumplimientoGeneral: expect.objectContaining({ porcentaje: null, total: 0 }),
        perspectivas: [expect.objectContaining({ orden: 1, kpis: [] })],
      }),
    );
  });

  it('propagates HTTP errors', () => {
    let error: unknown;
    service.obtener(5).subscribe({ error: (response) => (error = response) });

    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/seguimiento-kpis`);
    req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(500);
  });
});
