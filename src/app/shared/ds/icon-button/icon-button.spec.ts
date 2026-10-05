import { TestBed } from '@angular/core/testing';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  function create() {
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('label', 'Más opciones');
    return fixture;
  }

  it('maps size to the right pixel box', () => {
    const fixture = create();
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(fixture.componentInstance.box()).toBe(42);
  });

  it('outlined is true only for the secondary variant', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.outlined()).toBe(false);

    fixture.componentRef.setInput('variant', 'secondary');
    fixture.detectChanges();
    expect(fixture.componentInstance.outlined()).toBe(true);
  });

  it('emits clicked when enabled, not when disabled', () => {
    const fixture = create();
    fixture.detectChanges();
    const emitted: MouseEvent[] = [];
    fixture.componentInstance.clicked.subscribe((e) => emitted.push(e));

    fixture.componentInstance.onClick(new MouseEvent('click'));
    expect(emitted.length).toBe(1);

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.componentInstance.onClick(new MouseEvent('click'));
    expect(emitted.length).toBe(1);
  });
});
