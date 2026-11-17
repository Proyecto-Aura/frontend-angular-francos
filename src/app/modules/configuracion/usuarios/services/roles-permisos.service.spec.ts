import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { RolesPermisosService } from './roles-permisos.service';

const ROLES = `${environment.apiUrl}/roles`;

describe('RolesPermisosService', () => {
  let service: RolesPermisosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RolesPermisosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('arbolDeRutas() pide el árbol completo de rutas', () => {
    service.arbolDeRutas().subscribe();

    http.expectOne({ method: 'GET', url: `${environment.apiUrl}/rutas/tree` }).flush([]);
  });

  it('rutasDelRol() devuelve solo los accesos vigentes', () => {
    let ids: number[] = [];
    service.rutasDelRol(4).subscribe((set) => (ids = [...set]));

    http.expectOne({ method: 'GET', url: `${ROLES}/4/rutas` }).flush([
      { id: 1, rol_id: 4, ruta_id: 10, estado: true },
      { id: 2, rol_id: 4, ruta_id: 11, estado: false },
      { id: 3, rol_id: 4, ruta_id: 12, estado: true },
    ]);

    expect(ids).toEqual([10, 12]);
  });

  it('guardar() otorga con POST y revoca con DELETE, una llamada por ruta', () => {
    let terminado = false;
    service.guardar(4, [10, 11], [12]).subscribe(() => (terminado = true));

    http.expectOne({ method: 'POST', url: `${ROLES}/4/rutas/10` }).flush({});
    http.expectOne({ method: 'POST', url: `${ROLES}/4/rutas/11` }).flush({});
    expect(terminado).toBe(false);
    http.expectOne({ method: 'DELETE', url: `${ROLES}/4/rutas/12` }).flush({});

    expect(terminado).toBe(true);
  });

  it('guardar() sin diferencias no llama al backend', () => {
    let terminado = false;
    service.guardar(4, [], []).subscribe(() => (terminado = true));

    expect(terminado).toBe(true);
  });
});
