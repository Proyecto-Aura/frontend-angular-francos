import { TestBed } from '@angular/core/testing';
import { SolicitudesInsumos } from './solicitudes-insumos';

describe('SolicitudesInsumos', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(SolicitudesInsumos);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
