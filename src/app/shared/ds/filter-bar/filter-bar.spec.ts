import { TestBed } from '@angular/core/testing';
import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  it('creates with the default inputs', () => {
    const fixture = TestBed.createComponent(FilterBar);
    fixture.detectChanges();
    expect(fixture.componentInstance.hasSearch()).toBe(false);
    expect(fixture.componentInstance.hasActions()).toBe(false);
    expect(fixture.componentInstance.bare()).toBe(false);
  });
});
