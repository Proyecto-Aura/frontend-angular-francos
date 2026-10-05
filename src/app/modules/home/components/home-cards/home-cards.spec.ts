import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeCards } from './home-cards';

describe('HomeCards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function create() {
    const fixture = TestBed.createComponent(HomeCards);
    fixture.componentRef.setInput('icon', '/icons/module_ventas.svg');
    fixture.componentRef.setInput('title', 'Ventas');
    fixture.componentRef.setInput('description', 'Gestión de ventas y pedidos');
    return fixture;
  }

  it('creates and renders the title and description', () => {
    const fixture = create();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ventas');
    expect(text).toContain('Gestión de ventas y pedidos');
  });

  it('defaults routerLink to null when not provided', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.routerLink()).toBeNull();
  });
});
