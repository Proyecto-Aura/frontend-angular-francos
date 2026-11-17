import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/auth-layout/auth-layout').then((c) => c.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth-form-login/auth-form-login').then((c) => c.AuthFormLogin),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth-form-register/auth-form-register').then((c) => c.AuthFormRegister),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/auth-forgot-password/auth-forgot-password').then(
            (c) => c.AuthForgotPassword,
          ),
      },
      {
        path: 'reset',
        loadComponent: () => import('./pages/auth-reset/auth-reset').then((c) => c.AuthReset),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
];
