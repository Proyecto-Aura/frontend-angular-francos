import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { submit } from '@angular/forms/signals';
import { AuthForgotPassword } from './auth-forgot-password';
import { environment } from '../../../../../environments/environment';

const FORGOT_URL = `${environment.apiUrl}/auth/forgot-password`;
const GENERIC = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña';

describe('AuthForgotPassword', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(AuthForgotPassword);
    fixture.detectChanges();
    return fixture;
  }

  it('creates', () => {
    expect(create().componentInstance).toBeTruthy();
  });

  it('requires the email', () => {
    const { componentInstance: component } = create();
    expect(component.forgotForm.email().invalid()).toBe(true);
  });

  it('rejects a malformed email and one longer than 150 characters', () => {
    const { componentInstance: component } = create();

    component.forgotModel.set({ email: 'no-es-un-correo' });
    expect(component.forgotForm.email().invalid()).toBe(true);

    component.forgotModel.set({ email: `${'a'.repeat(145)}@x.com` });
    expect(component.forgotForm.email().invalid()).toBe(true);

    component.forgotModel.set({ email: 'ana@francos.test' });
    expect(component.forgotForm.email().invalid()).toBe(false);
  });

  it('does not call the backend while the form is invalid', async () => {
    const { componentInstance: component } = create();
    component.forgotModel.set({ email: 'no-es-un-correo' });

    await submit(component.forgotForm);

    httpMock.expectNone(FORGOT_URL);
  });

  it('sends the email and shows the generic message from the backend', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.forgotModel.set({ email: 'ana@francos.test' });

    const submission = submit(component.forgotForm);
    const req = httpMock.expectOne(FORGOT_URL);
    expect(req.request.body).toEqual({ email: 'ana@francos.test' });
    req.flush({ message: GENERIC });
    await submission;
    fixture.detectChanges();

    expect(component.sentMessage()).toBe(GENERIC);
    expect(component.forgotError()).toBeNull();
    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent).toContain(GENERIC);
    expect(status?.textContent).toContain('1 hora');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows a fallback message when the request fails without a backend message', async () => {
    const { componentInstance: component } = create();
    component.forgotModel.set({ email: 'ana@francos.test' });

    const submission = submit(component.forgotForm);
    httpMock
      .expectOne(FORGOT_URL)
      .flush({ message: ['email must be an email'] }, { status: 400, statusText: 'Bad Request' });
    await submission;

    expect(component.sentMessage()).toBeNull();
    expect(component.forgotError()).toBe(
      'No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.',
    );
  });
});
