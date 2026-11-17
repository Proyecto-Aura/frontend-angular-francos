import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { submit } from '@angular/forms/signals';
import { AuthReset } from './auth-reset';
import { environment } from '../../../../../environments/environment';

const RESET_URL = `${environment.apiUrl}/auth/reset-password`;

describe('AuthReset', () => {
  let httpMock: HttpTestingController;

  function configure(query: Record<string, string>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  function create() {
    const fixture = TestBed.createComponent(AuthReset);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  describe('without a token in the URL', () => {
    beforeEach(() => configure({}));

    it('shows "El enlace no es válido" with a link to ask for a new one, and no form', () => {
      const el: HTMLElement = create().nativeElement;

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('El enlace no es válido');
      const links = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      expect(links).toContain('/auth/forgot-password');
      expect(el.querySelector('form')).toBeNull();
    });
  });

  describe('with a token in the URL', () => {
    beforeEach(() => configure({ token: 'abc123' }));

    it('shows the form with both password fields', () => {
      const el: HTMLElement = create().nativeElement;
      expect(el.querySelector('form')).not.toBeNull();
      expect(el.querySelectorAll('app-auth-input')).toHaveLength(2);
    });

    it('requires both fields', () => {
      const { componentInstance: component } = create();
      expect(component.resetForm.password().invalid()).toBe(true);
      expect(component.resetForm.confirm().invalid()).toBe(true);
    });

    it('requires 8 to 255 characters', () => {
      const { componentInstance: component } = create();

      component.resetModel.set({ password: 'corta12', confirm: 'corta12' });
      expect(component.resetForm.password().invalid()).toBe(true);

      component.resetModel.set({ password: 'a'.repeat(256), confirm: 'a'.repeat(256) });
      expect(component.resetForm.password().invalid()).toBe(true);

      component.resetModel.set({ password: 'larga123', confirm: 'larga123' });
      expect(component.resetForm.password().invalid()).toBe(false);
    });

    it('flags a confirmation that does not match, and re-checks it when the password changes', () => {
      const { componentInstance: component } = create();

      component.resetModel.set({ password: 'nueva1234', confirm: 'otra12345' });
      expect(
        component.resetForm
          .confirm()
          .errors()
          .map((e) => e.kind),
      ).toContain('mismatch');

      component.resetModel.update((m) => ({ ...m, password: 'otra12345' }));
      expect(component.resetForm.confirm().invalid()).toBe(false);
    });

    it('does not call the backend while the form is invalid', async () => {
      const { componentInstance: component } = create();
      component.resetModel.set({ password: 'nueva1234', confirm: 'distinta1' });

      await submit(component.resetForm);

      httpMock.expectNone(RESET_URL);
    });

    it('sends token and both passwords, then goes to the login with ?restablecida=1', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const { componentInstance: component } = create();
      component.resetModel.set({ password: 'nueva1234', confirm: 'nueva1234' });

      const submission = submit(component.resetForm);
      const req = httpMock.expectOne(RESET_URL);
      expect(req.request.body).toEqual({
        token: 'abc123',
        nueva_contrasena: 'nueva1234',
        confirmar_contrasena: 'nueva1234',
      });
      req.flush({ message: 'Contraseña restablecida correctamente' });
      await submission;

      expect(component.resetError()).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { restablecida: 1 },
        replaceUrl: true,
      });
    });

    it('on an invalid/expired link (400), shows the backend message and offers a new link', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const fixture = create();
      const component = fixture.componentInstance;
      component.resetModel.set({ password: 'nueva1234', confirm: 'nueva1234' });

      const submission = submit(component.resetForm);
      httpMock
        .expectOne(RESET_URL)
        .flush(
          { statusCode: 400, message: 'El enlace de recuperación es inválido o ha expirado' },
          { status: 400, statusText: 'Bad Request' },
        );
      await submission;
      fixture.detectChanges();

      expect(component.resetError()).toBe('El enlace de recuperación es inválido o ha expirado');
      expect(navigate).not.toHaveBeenCalled();
      const links = Array.from(fixture.nativeElement.querySelectorAll('a')).map((a) =>
        (a as HTMLAnchorElement).getAttribute('href'),
      );
      expect(links).toContain('/auth/forgot-password');
    });

    it('on a validation error (message array in English), shows the Spanish fallback', async () => {
      const { componentInstance: component } = create();
      component.resetModel.set({ password: 'nueva1234', confirm: 'nueva1234' });

      const submission = submit(component.resetForm);
      httpMock
        .expectOne(RESET_URL)
        .flush(
          { statusCode: 400, message: ['nueva_contrasena must be longer than or equal to 8'] },
          { status: 400, statusText: 'Bad Request' },
        );
      await submission;

      expect(component.resetError()).toBe('No pudimos cambiar tu contraseña. Inténtalo de nuevo.');
    });
  });
});
