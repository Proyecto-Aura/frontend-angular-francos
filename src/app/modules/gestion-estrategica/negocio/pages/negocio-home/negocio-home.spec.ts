import { TestBed } from '@angular/core/testing';
import { NegocioHome } from './negocio-home';

describe('NegocioHome', () => {
  it('creates and renders its title', () => {
    const fixture = TestBed.createComponent(NegocioHome);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent).toContain(
      'Gestión estratégica de negocio',
    );
  });
});
