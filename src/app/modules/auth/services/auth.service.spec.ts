import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../../environments/environment';
import { LoginResponseDto, MeResponseDto } from '../interfaces/usuario-dto.interface';

const AUTH_BASE = `${environment.apiUrl}/auth`;

function makeResponse(): LoginResponseDto {
  return {
    access_token: 'fake-jwt-token',
    roles: ['admin'],
    email_verificado: true,
    debe_cambiar_contrasena: false,
  };
}

function makeMeResponse(overrides: Partial<MeResponseDto> = {}): MeResponseDto {
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

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with no session', () => {
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
  });

  it('POSTs { identificador, password } to /auth/login with credentials', () => {
    service.login('admin', 'admin123').subscribe();
    const req = httpMock.expectOne(`${AUTH_BASE}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identificador: 'admin', password: 'admin123' });
    expect(req.request.withCredentials).toBe(true);
    req.flush(makeResponse());
  });

  it('on success, stores the session in memory (not localStorage)', () => {
    service.login('admin', 'admin123').subscribe();
    httpMock.expectOne(`${AUTH_BASE}/login`).flush(makeResponse());

    expect(service.accessToken()).toBe('fake-jwt-token');
    expect(service.session()).toEqual({
      accessToken: 'fake-jwt-token',
      roles: ['admin'],
      emailVerificado: true,
      debeCambiarContrasena: false,
    });
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('francos_token')).toBeNull();
  });

  it('on failure, does not set a session', () => {
    service.login('admin', 'wrong').subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${AUTH_BASE}/login`)
      .flush(
        { statusCode: 401, message: 'Credenciales inválidas' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(service.session()).toBeNull();
  });

  it('refresh updates the access token and keeps the existing roles/flags', () => {
    service.login('admin', 'admin123').subscribe();
    httpMock.expectOne(`${AUTH_BASE}/login`).flush(makeResponse());

    service.refresh().subscribe();
    const req = httpMock.expectOne(`${AUTH_BASE}/refresh`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ access_token: 'new-token' });

    expect(service.accessToken()).toBe('new-token');
    expect(service.session()?.roles).toEqual(['admin']);
  });

  it('refresh with no prior session starts a minimal one', () => {
    service.refresh().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/refresh`).flush({ access_token: 'new-token' });

    expect(service.session()).toEqual({
      accessToken: 'new-token',
      roles: [],
      emailVerificado: false,
      debeCambiarContrasena: false,
    });
  });

  it('logout clears the session even if the backend call fails', () => {
    service.login('admin', 'admin123').subscribe();
    httpMock.expectOne(`${AUTH_BASE}/login`).flush(makeResponse());

    service.logout().subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${AUTH_BASE}/logout`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getCurrentUser fetches GET /auth/me', () => {
    service.getCurrentUser().subscribe((me) => expect(me).toEqual(makeMeResponse()));
    httpMock.expectOne(`${AUTH_BASE}/me`).flush(makeMeResponse());
  });

  it('getCurrentUser caches the result — a second call does not trigger a second HTTP request', () => {
    service.getCurrentUser().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush(makeMeResponse());

    service.getCurrentUser().subscribe();
    httpMock.expectNone(`${AUTH_BASE}/me`);
  });

  it('getCurrentUser cache is invalidated by a new login', () => {
    service.getCurrentUser().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush(makeMeResponse());

    service.login('ventas', 'ventas123').subscribe();
    httpMock.expectOne(`${AUTH_BASE}/login`).flush(makeResponse());

    service.getCurrentUser().subscribe();
    httpMock
      .expectOne(`${AUTH_BASE}/me`)
      .flush(makeMeResponse({ nombre_completo: 'Usuario de Ventas' }));
  });

  it('forgotPassword POSTs { email } to /auth/forgot-password and returns the backend message', () => {
    let message: string | undefined;
    service.forgotPassword('ana@francos.test').subscribe((res) => (message = res.message));

    const req = httpMock.expectOne(`${AUTH_BASE}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@francos.test' });
    req.flush({ message: 'Si el correo está registrado, recibirás un enlace' });

    expect(message).toBe('Si el correo está registrado, recibirás un enlace');
  });

  it('resetPassword POSTs { token, nueva_contrasena, confirmar_contrasena } to /auth/reset-password', () => {
    const body = { token: 'abc', nueva_contrasena: 'nueva1234', confirmar_contrasena: 'nueva1234' };
    service.resetPassword(body).subscribe();

    const req = httpMock.expectOne(`${AUTH_BASE}/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'Contraseña restablecida correctamente' });
  });

  it('getCurrentUser cache is invalidated by logout', () => {
    service.getCurrentUser().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush(makeMeResponse());

    service.logout().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/logout`).flush(null);

    service.getCurrentUser().subscribe();
    httpMock.expectOne(`${AUTH_BASE}/me`).flush(makeMeResponse());
  });
});
