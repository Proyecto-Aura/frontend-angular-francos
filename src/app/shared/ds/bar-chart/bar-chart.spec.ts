import { TestBed } from '@angular/core/testing';
import { BarChart } from './bar-chart';

describe('BarChart', () => {
  function create() {
    return TestBed.createComponent(BarChart);
  }

  it('computes max as the largest value in data', () => {
    const fixture = create();
    fixture.componentRef.setInput('data', [
      { label: 'Ene', value: 10 },
      { label: 'Feb', value: 25 },
      { label: 'Mar', value: 5 },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.max()).toBe(25);
  });

  it('max defaults to 1 when data is empty (avoids divide-by-zero)', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.max()).toBe(1);
  });

  it('barHeightPct computes a percentage relative to max', () => {
    const fixture = create();
    fixture.componentRef.setInput('data', [{ label: 'A', value: 50 }, { label: 'B', value: 100 }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.barHeightPct(50)).toBe(50);
  });

  it('formatted() uses the valueFormat input when provided, else String()', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.formatted(42)).toBe('42');

    fixture.componentRef.setInput('valueFormat', (v: number) => `$${v}`);
    fixture.detectChanges();
    expect(fixture.componentInstance.formatted(42)).toBe('$42');
  });
});
