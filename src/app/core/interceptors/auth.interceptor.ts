import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../modules/auth/services/auth.service';

// No se les agrega el Bearer (login/logout no lo necesitan; refresh usa la
// cookie httpOnly) ni se reintenta un refresh si estas mismas son las que fallan
// con 401 — eso causaria un loop infinito.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => req.url.includes(path));
  const token = authService.accessToken();
  const authedReq =
    token && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      // El access_token (40 min) expiro a mitad de uso: refrescarlo con la cookie
      // httpOnly y reintentar la request original una sola vez, transparente para
      // quien hizo el llamado.
      return authService.refresh().pipe(
        switchMap(() => {
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${authService.accessToken()}` },
          });
          return next(retried);
        }),
        catchError((refreshError) => {
          authService.session.set(null);
          router.navigateByUrl('/auth');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
