import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('starts expanded (collapsed = false)', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    expect(fixture.componentInstance.collapsed()).toBe(false);
  });

  it('toggle() flips the collapsed signal', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.toggle();
    expect(component.collapsed()).toBe(true);
    component.toggle();
    expect(component.collapsed()).toBe(false);
  });

  it('renders one link per entry in the links input', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('links', [
      { label: 'Clientes', path: '/ventas/clientes' },
      { label: 'Pedidos', path: '/ventas/pedidos' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(2);
  });
});
