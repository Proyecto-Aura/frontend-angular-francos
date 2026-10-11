import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Home } from './home';
import { environment } from '../../../../environments/environment';

const TREE_URL = `${environment.apiUrl}/rutas/mi-menu`;
const ME_URL = `${environment.apiUrl}/auth/me`;

describe('Home', () => {
  it('creates and renders its header, modules and perfil children', () => {
    // RouterLink (inside HomeCards) and HomePerfil's inject(Router) both need the real
    // router machinery from provideRouter — a bare `{ provide: Router, useValue: ... }`
    // stub breaks RouterLink/ActivatedRoute's internal root-route resolution. Spy on the
    // real router instead of replacing it.
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-modules')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-perfil')).toBeTruthy();

    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(TREE_URL).flush([]);
    httpMock.expectOne(ME_URL).flush({
      nombre_completo: "Admin Sistema Franco's",
      nombres: 'Admin',
      apellido_paterno: 'Sistema',
      apellido_materno: "Franco's",
      email: 'admin@francos.test',
      username: 'admin',
      roles: ['admin'],
    });
  });
});
