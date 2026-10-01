import { TestBed } from '@angular/core/testing';
import { HomeHeader } from './home-header';

describe('HomeHeader', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(HomeHeader);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
