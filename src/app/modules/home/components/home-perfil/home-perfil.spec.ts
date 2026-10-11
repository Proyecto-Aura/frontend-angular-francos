import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HomePerfil } from './home-perfil';
import { environment } from '../../../../../environments/environment';
import { MeResponseDto } from '../../../auth/interfaces/usuario-dto.interface';

const LOGOUT_URL = `${environment.apiUrl}/auth/logout`;
const ME_URL = `${environment.apiUrl}/auth/me`;

function makeMe(overrides: Partial<MeResponseDto> = {}): MeResponseDto {
  return {
    nombre_completo: "Admin Sistema Franco's",
    nombres: 'Admin',
    apellido_paterno: 'Sistema',
    apellido_materno: "Franco's",
    email: 'admin@francos.test',
    username: 'admin',
    roles: ['admin'],
    ...overrides,
  };
}

describe('HomePerfil', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let httpMock: HttpTestingController;

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with the placeholder userName while /auth/me responds', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    expect(fixture.componentInstance.userName()).toBe('Usuario');
    httpMock.expectOne(ME_URL).flush(makeMe());
  });

  it('replaces userName with the real nombre_completo once /auth/me responds', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush(makeMe({ nombre_completo: 'Juan Perez' }));

    expect(fixture.componentInstance.userName()).toBe('Juan Perez');
  });

  it('keeps the placeholder userName if /auth/me fails', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.userName()).toBe('Usuario');
  });

  it('onSubmit calls the backend logout and navigates to /auth once it completes', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush(makeMe());

    fixture.componentInstance.onSubmit();
    const req = httpMock.expectOne(LOGOUT_URL);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
  });

  it('still navigates to /auth even if the backend logout call fails', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush(makeMe());

    fixture.componentInstance.onSubmit();
    httpMock.expectOne(LOGOUT_URL).flush('error', { status: 500, statusText: 'Server Error' });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
  });
});
