import { TestBed } from '@angular/core/testing';
import { DsShowcase } from './ds-showcase';

describe('DsShowcase', () => {
  it('creates and renders the full design-system catalog without throwing', () => {
    const fixture = TestBed.createComponent(DsShowcase);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('modalOpen starts closed and the modal toggles via the signal', () => {
    const fixture = TestBed.createComponent(DsShowcase);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.modalOpen()).toBe(false);
    component.modalOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('page signal starts at 1', () => {
    const fixture = TestBed.createComponent(DsShowcase);
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
  });
});
