import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NegocioHome } from './negocio-home';

describe('NegocioHome', () => {
  it('creates and renders its title', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { titulo: 'Mapa estratégico' } } },
        },
      ],
    });
    const fixture = TestBed.createComponent(NegocioHome);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent).toContain(
      'Mapa estratégico',
    );
  });
});
