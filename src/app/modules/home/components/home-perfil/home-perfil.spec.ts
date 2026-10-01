import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HomePerfil } from './home-perfil';

describe('HomePerfil', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
  });

  it('creates with the default placeholder user data', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    expect(fixture.componentInstance.userName()).toBe('Andres Chavarri Centeno');
  });

  it('onSubmit navigates to /auth (logout action)', () => {
    const fixture = TestBed.createComponent(HomePerfil);
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
  });
});
