import { TestBed } from '@angular/core/testing';
import { AuthHome } from './auth-home';

describe('AuthHome', () => {
  it('creates and lists its 3 feature items', () => {
    const fixture = TestBed.createComponent(AuthHome);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance['features'].length).toBe(3);
  });
});
