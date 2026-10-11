import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function navLinks(fixture: ReturnType<typeof TestBed.createComponent<Sidebar>>): NodeListOf<HTMLAnchorElement> {
    return fixture.nativeElement.querySelector('nav').querySelectorAll('a');
  }

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

    expect(navLinks(fixture).length).toBe(2);
  });

  it('renders the sectionLabel above the links when set and expanded', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('sectionLabel', 'Gestión de Ventas');
    fixture.detectChanges();
    expect((fixture.nativeElement.textContent as string)).toContain('Gestión de Ventas');
  });

  it('hides the sectionLabel when the sidebar is collapsed', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('sectionLabel', 'Gestión de Ventas');
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    expect((fixture.nativeElement.textContent as string)).not.toContain('Gestión de Ventas');
  });

  it('a link with children renders as a toggle button, not an <a>, and starts collapsed', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('links', [
      { label: 'Catalogo', children: [{ label: 'Productos', path: 'catalogo/productos' }] },
    ]);
    fixture.detectChanges();

    expect(navLinks(fixture).length).toBe(0);
    expect(fixture.nativeElement.querySelector('nav button[type="button"]')).toBeTruthy();
    expect(fixture.componentInstance.isExpanded('Catalogo')).toBe(false);
  });

  it('toggleExpanded() flips expansion per label independently', () => {
    const fixture = TestBed.createComponent(Sidebar);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleExpanded('Catalogo');
    expect(component.isExpanded('Catalogo')).toBe(true);
    expect(component.isExpanded('Ventas')).toBe(false);

    component.toggleExpanded('Catalogo');
    expect(component.isExpanded('Catalogo')).toBe(false);
  });

  it('renders the children links only while expanded', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('links', [
      {
        label: 'Catalogo',
        children: [
          { label: 'Productos', path: 'catalogo/productos' },
          { label: 'Configuración', path: 'catalogo/configuracion' },
        ],
      },
    ]);
    fixture.detectChanges();
    expect(navLinks(fixture).length).toBe(0);

    fixture.componentInstance.toggleExpanded('Catalogo');
    fixture.detectChanges();
    expect(navLinks(fixture).length).toBe(2);
  });

  it('always renders a fixed "Inicio" link to /home, outside the data-driven nav', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    // Sin links() seteado (= []), el unico <a> de todo el componente tiene
    // que ser este botón fijo — confirma que vive fuera del <nav> de datos.
    expect(navLinks(fixture).length).toBe(0);
    const exitLink: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');
    expect(exitLink).toBeTruthy();
    expect(exitLink?.getAttribute('routerLink') ?? exitLink?.getAttribute('ng-reflect-router-link')).toBe('/home');
    expect((fixture.nativeElement.textContent as string)).toContain('Inicio');
  });
});
