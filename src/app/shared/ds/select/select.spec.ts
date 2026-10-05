import { TestBed } from '@angular/core/testing';
import { Select } from './select';

describe('Select', () => {
  function create() {
    return TestBed.createComponent(Select);
  }

  it('onChange updates the value model from the native event', () => {
    const fixture = create();
    fixture.detectChanges();
    const native = { value: 'lima' } as HTMLSelectElement;

    fixture.componentInstance.onChange({ target: native } as unknown as Event);
    expect(fixture.componentInstance.value()).toBe('lima');
  });

  it('maps size to the right control height', () => {
    const fixture = create();
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(fixture.componentInstance.height()).toBe('36px');
  });

  it('shellClasses reflects the invalid state', () => {
    const fixture = create();
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.shellClasses()).toContain('border-destructive');
  });
});
