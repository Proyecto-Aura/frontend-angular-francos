import { TestBed } from '@angular/core/testing';
import { TableroControl } from './tablero-control';

describe('TableroControl', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(TableroControl);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
