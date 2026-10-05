import { TestBed } from '@angular/core/testing';
import { Avatar } from './avatar';

describe('Avatar', () => {
  function create() {
    return TestBed.createComponent(Avatar);
  }

  it('computes initials from the first two words of the name', () => {
    const fixture = create();
    fixture.componentRef.setInput('name', 'Andres Chavarri Centeno');
    fixture.detectChanges();
    expect(fixture.componentInstance.initials()).toBe('AC');
  });

  it('computes a single initial for a one-word name', () => {
    const fixture = create();
    fixture.componentRef.setInput('name', 'Admin');
    fixture.detectChanges();
    expect(fixture.componentInstance.initials()).toBe('A');
  });

  it('maps size to the right pixel box', () => {
    const fixture = create();
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(fixture.componentInstance.box()).toBe(40);
  });
});
