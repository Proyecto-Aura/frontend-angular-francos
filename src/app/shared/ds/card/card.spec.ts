import { TestBed } from '@angular/core/testing';
import { Card } from './card';

describe('Card', () => {
  it('creates with the default inputs (padded true, no title/subtitle)', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.detectChanges();
    expect(fixture.componentInstance.padded()).toBe(true);
    expect(fixture.componentInstance.title()).toBeNull();
  });
});
