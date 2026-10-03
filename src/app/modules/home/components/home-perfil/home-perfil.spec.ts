import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HomePerfil } from './home-perfil';
import { environment } from '../../../../environments/environment';

const LOGOUT_URL = `${environment.apiUrl}/auth/logout`;

describe('HomePerfil', () => {
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

  it('creates with the default placeholder user data', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    expect(fixture.componentInstance.userName()).toBe('Andres Chavarri Centeno');
  });

  it('onSubmit calls the backend logout and navigates to /auth once it completes', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();
    const req = httpMock.expectOne(LOGOUT_URL);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
  });

  it('still navigates to /auth even if the backend logout call fails', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();
    httpMock.expectOne(LOGOUT_URL).flush('error', { status: 500, statusText: 'Server Error' });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
  });
});
