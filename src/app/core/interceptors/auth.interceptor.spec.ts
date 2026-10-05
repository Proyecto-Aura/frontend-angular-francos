import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../../modules/auth/services/auth.service';
import { environment } from '../../../environments/environment';

const AUTH_BASE = `${environment.apiUrl}/auth`;
const PROTECTED_URL = `${environment.apiUrl}/clientes`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('attaches the Bearer token to a protected request when a session exists', () => {
    authService.session.set({ accessToken: 'abc', roles: [], emailVerificado: false, debeCambiarContrasena: false });

    http.get(PROTECTED_URL).subscribe();
    const req = httpMock.expectOne(PROTECTED_URL);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('does not attach a header when there is no session', () => {
    http.get(PROTECTED_URL).subscribe();
    const req = httpMock.expectOne(PROTECTED_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not attach the Bearer token to the auth endpoints themselves', () => {
    authService.session.set({ accessToken: 'abc', roles: [], emailVerificado: false, debeCambiarContrasena: false });

    http.post(`${AUTH_BASE}/logout`, null).subscribe();
    const req = httpMock.expectOne(`${AUTH_BASE}/logout`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('on a 401 from a protected request, refreshes and retries once with the new token', () => {
    authService.session.set({ accessToken: 'expired', roles: [], emailVerificado: false, debeCambiarContrasena: false });

    let result: unknown;
    http.get(PROTECTED_URL).subscribe(res => (result = res));

    httpMock.expectOne(PROTECTED_URL).flush('expired', { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne(`${AUTH_BASE}/refresh`);
    refreshReq.flush({ access_token: 'fresh' });

    const retried = httpMock.expectOne(PROTECTED_URL);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh');
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('when the refresh also fails, clears the session and redirects to /auth', () => {
    authService.session.set({ accessToken: 'expired', roles: [], emailVerificado: false, debeCambiarContrasena: false });

    http.get(PROTECTED_URL).subscribe({ error: () => undefined });

    httpMock.expectOne(PROTECTED_URL).flush('expired', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${AUTH_BASE}/refresh`).flush('still invalid', { status: 401, statusText: 'Unauthorized' });

    expect(authService.session()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
  });

  it('does not try to refresh when the 401 comes from the login endpoint itself', () => {
    http.post(`${AUTH_BASE}/login`, {}).subscribe({ error: () => undefined });
    httpMock.expectOne(`${AUTH_BASE}/login`).flush('bad creds', { status: 401, statusText: 'Unauthorized' });

    httpMock.verify();
  });
});
