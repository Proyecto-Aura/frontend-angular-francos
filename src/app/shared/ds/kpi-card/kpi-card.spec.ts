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

  it('defaults to the md size (unchanged for existing usages)', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.valueClass()).toBe('text-ds-3xl');
    expect(fixture.componentInstance.iconBoxClass()).toBe('h-8 w-8');
  });

  it('uses smaller text/icon classes when size is sm', () => {
    const fixture = create();
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(fixture.componentInstance.valueClass()).toBe('text-ds-lg');
    expect(fixture.componentInstance.iconBoxClass()).toBe('h-7 w-7');
  });

  it('iconColors is null by default (el chip del icono queda como bg-accent, sin cambios)', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.iconColors()).toBeNull();
  });

  it('iconColors resuelve el color cuando se pasa un iconTone (mismos valores que BadgeTone)', () => {
    const fixture = create();
    fixture.componentRef.setInput('iconTone', 'warning');
    fixture.detectChanges();
    expect(fixture.componentInstance.iconColors()).toEqual({ bg: '#FDEFD8', fg: '#B35D00' });
  });
});
