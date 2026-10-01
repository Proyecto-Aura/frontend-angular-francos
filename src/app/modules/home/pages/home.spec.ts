import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  it('creates and renders its header, modules and perfil children', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Router, useValue: { navigateByUrl: vi.fn() } }],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-modules')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-home-perfil')).toBeTruthy();
  });
});
