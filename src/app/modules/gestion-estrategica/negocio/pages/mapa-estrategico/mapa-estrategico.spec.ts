import { TestBed } from '@angular/core/testing';
import { MapaEstrategico } from './mapa-estrategico';

describe('MapaEstrategico', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(MapaEstrategico);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
