import { TestBed } from '@angular/core/testing';
import { PedidosPorPreparar } from './pedidos-por-preparar';

describe('PedidosPorPreparar', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(PedidosPorPreparar);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
