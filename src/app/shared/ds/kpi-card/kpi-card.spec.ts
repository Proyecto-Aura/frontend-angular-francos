import { TestBed } from '@angular/core/testing';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  function create() {
    return TestBed.createComponent(KpiCard);
  }

  it('toneClass is text-success for an "up" delta', () => {
    const fixture = create();
    fixture.componentRef.setInput('deltaTone', 'up');
    fixture.detectChanges();
    expect(fixture.componentInstance.toneClass()).toBe('text-success');
  });

  it('toneClass is text-destructive for a "down" delta', () => {
    const fixture = create();
    fixture.componentRef.setInput('deltaTone', 'down');
    fixture.detectChanges();
    expect(fixture.componentInstance.toneClass()).toBe('text-destructive');
  });

  it('toneClass is muted for "neutral" (the default)', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.toneClass()).toBe('text-muted-foreground');
  });
});
