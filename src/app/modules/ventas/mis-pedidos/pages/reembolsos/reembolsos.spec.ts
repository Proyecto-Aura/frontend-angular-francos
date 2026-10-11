import { TestBed } from '@angular/core/testing';
import { Reembolsos } from './reembolsos';

describe('Reembolsos', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(Reembolsos);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
