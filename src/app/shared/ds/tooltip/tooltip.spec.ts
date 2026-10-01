import { TestBed } from '@angular/core/testing';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  it('positionClass points up (bottom-anchored) by default', () => {
    const fixture = TestBed.createComponent(Tooltip);
    fixture.detectChanges();
    expect(fixture.componentInstance.positionClass()).toBe('bottom-[calc(100%+6px)]');
  });

  it('positionClass points down when placement is "bottom"', () => {
    const fixture = TestBed.createComponent(Tooltip);
    fixture.componentRef.setInput('placement', 'bottom');
    fixture.detectChanges();
    expect(fixture.componentInstance.positionClass()).toBe('top-[calc(100%+6px)]');
  });
});
