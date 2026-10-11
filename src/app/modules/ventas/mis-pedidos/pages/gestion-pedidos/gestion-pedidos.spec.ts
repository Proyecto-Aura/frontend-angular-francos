import { TestBed } from '@angular/core/testing';
import { GestionPedidos } from './gestion-pedidos';

describe('GestionPedidos', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(GestionPedidos);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
