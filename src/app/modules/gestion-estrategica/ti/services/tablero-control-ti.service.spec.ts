import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { TableroControlTiDto } from '../interfaces/tablero-control-ti-dto.interface';
import { TableroControlTiService } from './tablero-control-ti.service';

function makeDto(): TableroControlTiDto {
  return {
    plan: {
      id: 5,
      codigo: 'PE-0005',
      nombre: 'Plan institucional',
      anio_inicio: 2026,
      anio_fin: 2027,
      estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' },
    },
    perspectivas: [{ id: 1, nombre: 'Financiera', objetivos: [] }],
  };
}

describe('TableroControlTiService', () => {
  let service: TableroControlTiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TableroControlTiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets and maps the control dashboard for a plan', () => {
    let result: unknown;
    service.obtener(5).subscribe((tablero) => (result = tablero));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/planes-estrategicos/5/tablero-control-ti`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(makeDto());

    expect(result).toEqual(
      expect.objectContaining({
        planId: 5,
        planNombre: 'Plan institucional',
        anioInicio: 2026,
        anioFin: 2027,
        perspectivas: [expect.objectContaining({ nombre: 'Financiera', orden: 1, kpis: [] })],
      }),
    );
  });

  it('propagates HTTP errors', () => {
    let error: unknown;
    service.obtener(5).subscribe({ error: (response) => (error = response) });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/planes-estrategicos/5/tablero-control-ti`,
    );
    req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(500);
  });
});
