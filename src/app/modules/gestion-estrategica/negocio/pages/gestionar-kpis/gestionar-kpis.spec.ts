import { TestBed } from '@angular/core/testing';
import { GestionarKpis } from './gestionar-kpis';

describe('GestionarKpis', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(GestionarKpis);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
