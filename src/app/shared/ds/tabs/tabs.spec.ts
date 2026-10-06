import { TestBed } from '@angular/core/testing';
import { Tabs } from './tabs';

describe('Tabs', () => {
  it('renders one button per tab and emits changed on click', () => {
    const fixture = TestBed.createComponent(Tabs);
    fixture.componentRef.setInput('tabs', [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.changed.subscribe((id) => emitted.push(id));

    const buttons = fixture.nativeElement.querySelectorAll('button[role="tab"]');
    expect(buttons.length).toBe(2);

    buttons[1].click();
    expect(emitted).toEqual(['b']);
  });

  it('renders the count badge only when count is defined, including when it is 0', () => {
    const fixture = TestBed.createComponent(Tabs);
    fixture.componentRef.setInput('tabs', [
      { id: 'a', label: 'A', count: 0 },
      { id: 'b', label: 'B' },
    ]);
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('button[role="tab"] span');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent?.trim()).toBe('0');
  });
});
