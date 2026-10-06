import { TestBed } from '@angular/core/testing';
import { Topbar } from './topbar';

describe('Topbar', () => {
  it('creates with the default inputs', () => {
    const fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
    expect(fixture.componentInstance.title()).toBeNull();
    expect(fixture.componentInstance.userPlacement()).toBe('right');
  });

  it('renders the title text when provided', () => {
    const fixture = TestBed.createComponent(Topbar);
    fixture.componentRef.setInput('title', 'Dashboard');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent as string).toContain('Dashboard');
  });
});
