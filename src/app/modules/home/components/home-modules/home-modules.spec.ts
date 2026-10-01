import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeModules } from './home-modules';

describe('HomeModules', () => {
  it('renders one app-home-cards per configured module', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomeModules);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-home-cards');
    expect(cards.length).toBe(fixture.componentInstance['modules'].length);
    expect(cards.length).toBeGreaterThan(0);
  });
});
