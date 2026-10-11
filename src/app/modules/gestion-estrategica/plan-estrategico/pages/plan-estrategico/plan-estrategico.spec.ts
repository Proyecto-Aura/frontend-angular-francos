import { TestBed } from '@angular/core/testing';
import { PlanEstrategico } from './plan-estrategico';

describe('PlanEstrategico', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(PlanEstrategico);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
