import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { CatalogoKpiService } from './catalogo-kpi.service';

describe('CatalogoKpiService', () => {
  let service: CatalogoKpiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoKpiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists and maps frequencies', () => {
    let result: unknown;
    service.listarFrecuencias().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/frecuencias-medicion`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nombre: 'Mensual', periodos_por_anio: 12, orden: 1 }]);
    expect(result).toEqual([{ id: 1, nombre: 'Mensual', periodosPorAnio: 12, orden: 1 }]);
  });

  it('lists periods using the frequency id', () => {
    service.listarPeriodos(2).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/periodos` &&
        request.params.get('frecuencia_id') === '2',
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, codigo: 'T1', nombre: 'Trimestre 1', numero: 1, mes_fin: 3 }]);
  });

  it('lists and maps measurement units', () => {
    let result: unknown;
    service.listarUnidades().subscribe((items) => (result = items));

    const req = httpMock.expectOne(`${environment.apiUrl}/unidades-medida-kpi`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 3, nombre: 'Porcentaje', simbolo: '%', decimales: 2 }]);
    expect(result).toEqual([{ id: 3, nombre: 'Porcentaje', simbolo: '%', decimales: 2 }]);
  });

  it('requests cached catalogs only once when called twice', () => {
    service.listarFrecuencias().subscribe();
    service.listarFrecuencias().subscribe();
    service.listarUnidades().subscribe();
    service.listarUnidades().subscribe();

    const frecuencias = httpMock.match(`${environment.apiUrl}/frecuencias-medicion`);
    const unidades = httpMock.match(`${environment.apiUrl}/unidades-medida-kpi`);
    expect(frecuencias).toHaveLength(1);
    expect(unidades).toHaveLength(1);
    frecuencias[0].flush([]);
    unidades[0].flush([]);
  });
});
