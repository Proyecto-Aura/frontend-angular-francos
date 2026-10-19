import { TestBed } from '@angular/core/testing';
import { StockInsumos } from './stock-insumos';

describe('StockInsumos', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(StockInsumos);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
