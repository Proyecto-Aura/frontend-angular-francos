import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

@Component({ selector: 'app-fake-icon', template: '<svg></svg>' })
class FakeIcon {}

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
