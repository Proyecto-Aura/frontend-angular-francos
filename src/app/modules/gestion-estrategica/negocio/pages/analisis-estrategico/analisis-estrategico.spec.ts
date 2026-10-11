import { TestBed } from '@angular/core/testing';
import { AnalisisEstrategico } from './analisis-estrategico';

describe('AnalisisEstrategico', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(AnalisisEstrategico);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
