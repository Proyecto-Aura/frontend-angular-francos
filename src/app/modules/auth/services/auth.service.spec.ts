import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { LoginResponseDto } from '../interfaces/usuario-dto.interface';

const TOKEN_KEY = 'francos_token';

function makeResponse(): LoginResponseDto {
  return {
    token: 'fake-jwt-token',
    usuario: {
      id: 1,
      email: 'admin@francos.com',
      username: 'admin',
      estado: 'activo',
      persona_id: 10,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(TOKEN_KEY);
  });

  it('starts with no authenticated user', () => {
    expect(service.usuario()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('POSTs credentials to /api/auth/login', () => {
    service.login('admin', 'admin123').subscribe();
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'admin', password: 'admin123' });
    req.flush(makeResponse());
  });

  it('on success, stores the token and maps the usuario onto the signal', () => {
    service.login('admin', 'admin123').subscribe();
    httpMock.expectOne('/api/auth/login').flush(makeResponse());

    expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-jwt-token');
    expect(service.usuario()).toEqual({ id: 1, email: 'admin@francos.com', username: 'admin', activo: true });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('on failure, does not store a token or set the usuario', () => {
    service.login('admin', 'wrong').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/auth/login').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(service.usuario()).toBeNull();
  });

  it('logout clears the token and the usuario signal', () => {
    service.login('admin', 'admin123').subscribe();
    httpMock.expectOne('/api/auth/login').flush(makeResponse());

    service.logout();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getToken reads whatever is in localStorage', () => {
    expect(service.getToken()).toBeNull();
    localStorage.setItem(TOKEN_KEY, 'manual-token');
    expect(service.getToken()).toBe('manual-token');
  });
});
