import { TestBed } from '@angular/core/testing';
import { ConfiguracionCatalogo } from './configuracion-catalogo';

describe('ConfiguracionCatalogo', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(ConfiguracionCatalogo);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
