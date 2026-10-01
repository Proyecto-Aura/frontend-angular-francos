import { TestBed } from '@angular/core/testing';
import { ListarClientes } from './listar-clientes';

describe('ListarClientes', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(ListarClientes);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
