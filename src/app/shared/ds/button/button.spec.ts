import { TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  function create() {
    return TestBed.createComponent(Button);
  }

  it('emits clicked when enabled', () => {
    const fixture = create();
    fixture.detectChanges();
    const emitted: MouseEvent[] = [];
    fixture.componentInstance.clicked.subscribe((e) => emitted.push(e));

    const event = new MouseEvent('click');
    fixture.componentInstance.onClick(event);
    expect(emitted).toEqual([event]);
  });

  it('does not emit clicked when disabled', () => {
    const fixture = create();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const emitted: MouseEvent[] = [];
    fixture.componentInstance.clicked.subscribe((e) => emitted.push(e));

    fixture.componentInstance.onClick(new MouseEvent('click'));
    expect(emitted).toEqual([]);
  });

  it('appends w-full to the computed classes only when fullWidth is true', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.classes()).not.toContain('w-full');

    fixture.componentRef.setInput('fullWidth', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.classes()).toContain('w-full');
  });

  it('the link variant omits the size classes', () => {
    const fixture = create();
    fixture.componentRef.setInput('variant', 'link');
    fixture.detectChanges();
    expect(fixture.componentInstance.classes()).not.toContain('h-(--control-height)');
  });
});
