import { TestBed } from '@angular/core/testing';
import { StockProductos } from './stock-productos';

describe('StockProductos', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(StockProductos);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
