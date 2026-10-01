import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { submit } from '@angular/forms/signals';
import { AuthFormLogin } from './auth-form-login';
import { LoginResponseDto } from '../../interfaces/usuario-dto.interface';

describe('AuthFormLogin', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let httpMock: HttpTestingController;

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(AuthFormLogin);
    fixture.detectChanges();
    return fixture;
  }

  it('creates', () => {
    expect(create().componentInstance).toBeTruthy();
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

  it('on successful login, clears loginError and navigates to /home', async () => {
    const { componentInstance: component } = create();
    component.loginModel.set({ username: 'admin', password: 'admin123' });

    const submission = submit(component.loginForm);
    const req = httpMock.expectOne('/api/auth/login');
    req.flush({ token: 't', usuario: { id: 1, email: 'a@a.com', username: 'admin', estado: 'activo', persona_id: 1, created_at: '', updated_at: '' } } satisfies LoginResponseDto);
    await submission;

    expect(component.loginError()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('on failed login, sets loginError and does not navigate', async () => {
    const { componentInstance: component } = create();
    component.loginModel.set({ username: 'admin', password: 'wrong' });

    const submission = submit(component.loginForm);
    const req = httpMock.expectOne('/api/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    await submission;

    expect(component.loginError()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
