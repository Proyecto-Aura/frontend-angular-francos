import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

// Mirrors the input surface Icon forwards via [ngComponentOutletInputs] (size, strokeWidth,
// color) — a stub without them causes NG0303 "Can't set value of the input" warnings.
@Component({ selector: 'app-fake-icon', template: '<svg></svg>' })
class FakeIcon {
  size = input(0);
  strokeWidth = input(0);
  color = input('');
}

describe('Icon', () => {
  it('creates with the given icon component and default size/strokeWidth', () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('img', FakeIcon);
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toBe(16);
    expect(fixture.componentInstance.strokeWidth()).toBe(2);
    expect(fixture.componentInstance.color()).toBe('currentColor');
  });
});
