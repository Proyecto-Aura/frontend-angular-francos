import { TestBed } from '@angular/core/testing';
import { SolicitudesProduccion } from './solicitudes-produccion';

describe('SolicitudesProduccion', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(SolicitudesProduccion);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
