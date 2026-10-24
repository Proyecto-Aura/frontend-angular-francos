import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { UbigeoService } from './ubigeo.service';

const UBIGEO_BASE = `${environment.apiUrl}/ubigeo`;

describe('UbigeoService', () => {
  let service: UbigeoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UbigeoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists the departments', () => {
    let resultado: unknown;
    service.departamentos().subscribe((items) => (resultado = items));

    const req = httpMock.expectOne(`${UBIGEO_BASE}/departamentos`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '15', nombre: 'Lima' }]);

    expect(resultado).toEqual([{ id: '15', nombre: 'Lima' }]);
  });

  it('lists the provinces of a department', () => {
    service.provincias('15').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${UBIGEO_BASE}/provincias` && r.params.get('departamento_id') === '15',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('lists the districts of a province', () => {
    service.distritos('1501').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${UBIGEO_BASE}/distritos` && r.params.get('provincia_id') === '1501',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
