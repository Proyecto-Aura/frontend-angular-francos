import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';

describe('routes', () => {
  // El backend arma el enlace del correo como <portal>/reset-password?token=…
  it('/reset-password?token=… redirects to /auth/reset keeping the token', () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);

    const redirect = routes.find((r) => r.path === 'reset-password')?.redirectTo;
    expect(typeof redirect).toBe('function');

    const url = TestBed.runInInjectionContext(() =>
      (redirect as (data: { queryParams: Record<string, string> }) => unknown)({
        queryParams: { token: 'abc123' },
      }),
    );
    expect(router.serializeUrl(url as ReturnType<Router['parseUrl']>)).toBe(
      '/auth/reset?token=abc123',
    );
  });
});
