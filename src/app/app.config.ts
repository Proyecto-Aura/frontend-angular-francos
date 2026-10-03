import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './modules/auth/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Intenta restaurar la sesion con la cookie httpOnly del refresh_token antes
    // de que cualquier guard decida si te deja pasar. Si no hay cookie valida
    // (visitante nuevo o sesion vencida), el 401 se traga aca — es el caso
    // normal, no un error que deba frenar el arranque de la app.
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.refresh().pipe(catchError(() => of(null))));
    }),
  ]
};
