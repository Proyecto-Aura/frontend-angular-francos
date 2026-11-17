import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { submit } from '@angular/forms/signals';
import { AuthFormLogin } from './auth-form-login';
import { environment } from '../../../../../environments/environment';
import { LoginResponseDto } from '../../interfaces/usuario-dto.interface';

const LOGIN_URL = `${environment.apiUrl}/auth/login`;

describe('AuthFormLogin', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let httpMock: HttpTestingController;

  function configure(query: Record<string, string> = {}) {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => configure());

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(AuthFormLogin);
    fixture.detectChanges();
    return fixture;
  }

  it('creates', () => {
    expect(create().componentInstance).toBeTruthy();
  });

  it('"¿Has olvidado tu contraseña?" navigates to /auth/forgot-password', () => {
    create().componentInstance.onForgotPassword();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/forgot-password');
  });

  it('does not show the "password updated" notice by default', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the "password updated" notice when arriving with ?restablecida=1', () => {
    TestBed.resetTestingModule();
    configure({ restablecida: '1' });
    const notice = create().nativeElement.querySelector('[role="status"]');
    expect(notice?.textContent).toContain('Ya puedes iniciar sesión');
  });

  it('marks username and password as invalid when empty', () => {
    const { componentInstance: component } = create();
    expect(component.loginForm.username().invalid()).toBe(true);
    expect(component.loginForm.password().invalid()).toBe(true);
  });

  it('becomes valid once both fields have a value', () => {
    const { componentInstance: component } = create();
    component.loginModel.set({ username: 'admin', password: 'admin123' });
    expect(component.loginForm.username().invalid()).toBe(false);
    expect(component.loginForm.password().invalid()).toBe(false);
  });

  it('on successful login, shows a green success toast and navigates to /home shortly after', async () => {
    vi.useFakeTimers();
    const { componentInstance: component } = create();
    component.loginModel.set({ username: 'admin', password: 'admin123' });

    const submission = submit(component.loginForm);
    const req = httpMock.expectOne(LOGIN_URL);
    expect(req.request.body).toEqual({ identificador: 'admin', password: 'admin123' });
    req.flush({
      access_token: 't',
      roles: ['admin'],
      email_verificado: true,
      debe_cambiar_contrasena: false,
    } satisfies LoginResponseDto);
    await submission;

    expect(component.toast()).toMatchObject({ tone: 'success', title: 'Inicio de sesión exitoso' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    vi.advanceTimersByTime(700);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    vi.useRealTimers();
  });

  it('on failed login, shows a red error toast with the backend message and does not navigate', async () => {
    vi.useFakeTimers();
    const { componentInstance: component } = create();
    component.loginModel.set({ username: 'admin', password: 'wrong' });

    const submission = submit(component.loginForm);
    const req = httpMock.expectOne(LOGIN_URL);
    req.flush(
      { statusCode: 401, message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await submission;

    expect(component.toast()).toMatchObject({ tone: 'error', title: 'Credenciales inválidas' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('on a network/unexpected error, shows an error toast with the generic fallback message', async () => {
    vi.useFakeTimers();
    const { componentInstance: component } = create();
    component.loginModel.set({ username: 'admin', password: 'admin123' });

    const submission = submit(component.loginForm);
    const req = httpMock.expectOne(LOGIN_URL);
    req.error(new ProgressEvent('error'));
    await submission;

    expect(component.toast()).toMatchObject({
      tone: 'error',
      title: 'No se pudo iniciar sesión. Intenta de nuevo.',
    });
    vi.useRealTimers();
  });

  it('attempting to submit with empty fields shows a yellow warning toast, marks the fields touched and does not call the backend', async () => {
    vi.useFakeTimers();
    const fixture = create();
    const component = fixture.componentInstance;

    await submit(component.loginForm);
    fixture.detectChanges();

    expect(component.toast()).toMatchObject({
      tone: 'warning',
      title: 'Faltan campos por completar',
    });
    expect(fixture.nativeElement.textContent).toContain('El usuario es obligatorio');
    expect(fixture.nativeElement.textContent).toContain('La contraseña es obligatoria');
    httpMock.expectNone(LOGIN_URL);
    vi.useRealTimers();
  });

  it('closing the toast hides it', async () => {
    vi.useFakeTimers();
    const { componentInstance: component } = create();

    await submit(component.loginForm);
    expect(component.toast()).not.toBeNull();

    component.cerrarToast();
    vi.advanceTimersByTime(300);
    expect(component.toast()).toBeNull();
    vi.useRealTimers();
  });
});
