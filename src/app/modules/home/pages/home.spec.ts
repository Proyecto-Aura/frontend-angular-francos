import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  it('creates and renders its header, modules and perfil children', () => {
    // RouterLink (inside HomeCards) and HomePerfil's inject(Router) both need the real
    // router machinery from provideRouter — a bare `{ provide: Router, useValue: ... }`
    // stub breaks RouterLink/ActivatedRoute's internal root-route resolution. Spy on the
    // real router instead of replacing it.
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-modules')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-perfil')).toBeTruthy();
  });
});
