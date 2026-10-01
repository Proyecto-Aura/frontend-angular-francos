import { TestBed } from '@angular/core/testing';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  function create() {
    return TestBed.createComponent(Checkbox);
  }

  it('onChange updates the checked model from the native event', () => {
    const fixture = create();
    fixture.detectChanges();
    const input = { checked: true } as HTMLInputElement;

    fixture.componentInstance.onChange({ target: input } as unknown as Event);
    expect(fixture.componentInstance.checked()).toBe(true);
  });

  it('on is true when checked OR indeterminate', () => {
    const fixture = create();
    fixture.componentRef.setInput('indeterminate', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(true);
  });

  it('on is false when neither checked nor indeterminate', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(false);
  });
});
