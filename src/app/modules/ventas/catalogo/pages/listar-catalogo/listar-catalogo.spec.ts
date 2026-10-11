import { TestBed } from '@angular/core/testing';
import { ListarCatalogo } from './listar-catalogo';

describe('ListarCatalogo', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(ListarCatalogo);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
