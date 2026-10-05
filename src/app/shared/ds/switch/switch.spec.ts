import { TestBed } from '@angular/core/testing';
import { Switch } from './switch';

describe('Switch', () => {
  it('onChange updates the checked model from the native event', () => {
    const fixture = TestBed.createComponent(Switch);
    fixture.detectChanges();
    const native = { checked: true } as HTMLInputElement;

    fixture.componentInstance.onChange({ target: native } as unknown as Event);
    expect(fixture.componentInstance.checked()).toBe(true);
  });
});
