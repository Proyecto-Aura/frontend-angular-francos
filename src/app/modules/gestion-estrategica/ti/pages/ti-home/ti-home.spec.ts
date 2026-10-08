import { TestBed } from '@angular/core/testing';
import { TiHome } from './ti-home';

describe('TiHome', () => {
  it('creates and renders its title', () => {
    const fixture = TestBed.createComponent(TiHome);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent).toContain(
      'Gestión estratégica de TI',
    );
  });
});
