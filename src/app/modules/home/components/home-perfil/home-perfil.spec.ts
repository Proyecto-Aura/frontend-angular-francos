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
    foto_url: null,
    ...overrides,
  };
}

describe('HomePerfil', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let httpMock: HttpTestingController;

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
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

  it('sets avatarUrl from the foto_url that /auth/me responds', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    const url = 'http://localhost:9000/francos-media/usuarios/a.png';
    httpMock.expectOne(ME_URL).flush(makeMe({ foto_url: url }));

    expect(fixture.componentInstance.avatarUrl()).toBe(url);
  });

  it('keeps avatarUrl null when /auth/me responds with no photo', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.avatarUrl()).toBeNull();
  });

  it('shows the initials when there is no photo', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush(makeMe({ nombre_completo: 'Lucia Quispe' }));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.rounded-full img')).toBeNull();
    expect(el.textContent).toContain('LQ');
  });

  it('shows the photo instead of initials once avatarUrl is set', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    const url = 'http://localhost:9000/francos-media/usuarios/a.png';
    httpMock.expectOne(ME_URL).flush(makeMe({ foto_url: url }));
    fixture.detectChanges();

    const img = (fixture.nativeElement as HTMLElement).querySelector('.rounded-full img');
    expect(img?.getAttribute('src')).toBe(url);
  });

  it('keeps the placeholder userName if /auth/me fails', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.userName()).toBe('Usuario');
  });

  it('shows a "Cerrando sesión" toast and navigates to /auth shortly after it completes', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(HomePerfil);
      fixture.detectChanges();
      httpMock.expectOne(ME_URL).flush(makeMe());

      fixture.componentInstance.onSubmit();
      const req = httpMock.expectOne(LOGOUT_URL);
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      expect(fixture.componentInstance.toast()).toMatchObject({
        tone: 'success',
        title: 'Cerrando sesión',
      });
      expect(router.navigateByUrl).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1200);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a warning toast and still navigates to /auth shortly after, if the backend logout call fails', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(HomePerfil);
      fixture.detectChanges();
      httpMock.expectOne(ME_URL).flush(makeMe());

      fixture.componentInstance.onSubmit();
      httpMock.expectOne(LOGOUT_URL).flush('error', { status: 500, statusText: 'Server Error' });

      expect(fixture.componentInstance.toast()).toMatchObject({
        tone: 'warning',
        title: 'No se pudo cerrar sesión en el servidor',
      });
      expect(router.navigateByUrl).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1200);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    } finally {
      vi.useRealTimers();
    }
  });

  it('"Cambiar contraseña" navega a /auth/forgot-password', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    httpMock.expectOne(ME_URL).flush(makeMe());

    const el = fixture.nativeElement as HTMLElement;
    const boton = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cambiar contraseña'),
    )!;
    boton.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/forgot-password');
  });
});
