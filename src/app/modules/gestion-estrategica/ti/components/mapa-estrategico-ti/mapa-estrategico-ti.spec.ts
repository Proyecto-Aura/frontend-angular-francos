import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerspectivaBsc } from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { MapaEstrategicoTi } from './mapa-estrategico-ti';

function makePerspectiva(overrides: Partial<PerspectivaBsc> = {}): PerspectivaBsc {
  return {
    id: 1,
    nombre: 'Financiera',
    orden: 1,
    ...overrides,
  };
}

function makeObjetivoTi(overrides: Partial<ObjetivoEstrategicoTi> = {}): ObjetivoEstrategicoTi {
  return {
    id: 1,
    codigo: 'PE-0005-OE-TI-001',
    planId: 5,
    nombre: 'Modernizar la plataforma tecnológica',
    descripcion: null,
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [2, 3],
    oeNegocioId: 10,
    oeNegocio: {
      id: 10,
      codigo: 'PE-0005-OE-N-001',
      nombre: 'Incrementar la rentabilidad',
    },
    ...overrides,
  };
}

const PERSPECTIVAS: PerspectivaBsc[] = [
  makePerspectiva(),
  makePerspectiva({ id: 2, nombre: 'Clientes', orden: 2 }),
  makePerspectiva({ id: 3, nombre: 'Procesos internos', orden: 3 }),
  makePerspectiva({ id: 4, nombre: 'Aprendizaje y crecimiento', orden: 4 }),
];

const OBJETIVOS: ObjetivoEstrategicoTi[] = [
  makeObjetivoTi(),
  makeObjetivoTi({
    id: 2,
    codigo: 'PE-0005-OE-TI-002',
    nombre: 'Mejorar la experiencia digital',
    perspectivaId: 2,
    perspectivaNombre: 'Clientes',
    perspectivaOrden: 2,
    relacionesDestinoIds: [],
  }),
  makeObjetivoTi({
    id: 3,
    codigo: 'PE-0005-OE-TI-003',
    nombre: 'Automatizar procesos',
    perspectivaId: 3,
    perspectivaNombre: 'Procesos internos',
    perspectivaOrden: 3,
    relacionesDestinoIds: [2],
  }),
  makeObjetivoTi({
    id: 4,
    codigo: 'PE-0005-OE-TI-004',
    nombre: 'Fortalecer capacidades digitales',
    perspectivaId: 4,
    perspectivaNombre: 'Aprendizaje y crecimiento',
    perspectivaOrden: 4,
    relacionesDestinoIds: [],
  }),
];

describe('MapaEstrategicoTi', () => {
  function create(): ComponentFixture<MapaEstrategicoTi> {
    const fixture = TestBed.createComponent(MapaEstrategicoTi);
    fixture.componentRef.setInput('perspectivas', PERSPECTIVAS);
    fixture.componentRef.setInput('objetivos', OBJETIVOS);
    fixture.detectChanges();
    return fixture;
  }

  it('renders four lanes, one card per objective, and one path per relationship', () => {
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('span.uppercase')).toHaveLength(4);
    for (const perspectiva of PERSPECTIVAS) {
      expect(element.textContent).toContain(perspectiva.nombre);
    }
    expect(element.querySelectorAll('[tabindex="0"]')).toHaveLength(4);
    expect(element.querySelectorAll('path[marker-end]')).toHaveLength(3);
    expect(element.querySelector('.relative')?.classList).toContain('min-w-full');
  });

  it('shortens TI objective codes and builds accessible relationship labels', () => {
    const component = create().componentInstance;

    expect(component.codigoCorto('PE-0005-OE-TI-001')).toBe('OE-TI-001');
    expect(component.ariaLabel(OBJETIVOS[0])).toBe(
      'Modernizar la plataforma tecnológica, influye en 2 objetivos de TI',
    );
    expect(component.ariaLabel(OBJETIVOS[1])).toBe(
      'Mejorar la experiencia digital, influye en 0 objetivos de TI',
    );
  });

  it('maps every perspective order to its lane, text, and card classes', () => {
    const component = create().componentInstance;

    expect([1, 2, 3, 4].map((orden) => component.claseFondoFranja(orden))).toEqual([
      'bg-success/7',
      'bg-info/7',
      'bg-warning/8',
      'bg-muted-foreground/7',
    ]);
    expect([1, 2, 3, 4].map((orden) => component.claseTextoPerspectiva(orden))).toEqual([
      'text-success',
      'text-info',
      'text-warning',
      'text-muted-foreground',
    ]);
    expect([1, 2, 3, 4].map((orden) => component.claseBordeTarjeta(orden))).toEqual([
      'border-success/45',
      'border-info/45',
      'border-warning/50',
      'border-muted-foreground/45',
    ]);
  });

  it('highlights only related cards and paths while hovering', () => {
    const component = create().componentInstance;
    const [primeraRelacion, segundaRelacion, terceraRelacion] = component.layout().relaciones;

    expect(component.grosorRelacion(primeraRelacion)).toBe(1.5);
    expect(component.opacidadRelacion(primeraRelacion)).toBe(0.6);

    component.hoverId.set(1);
    expect(component.tarjetaAtenuada(1)).toBe(false);
    expect(component.tarjetaAtenuada(2)).toBe(false);
    expect(component.tarjetaAtenuada(3)).toBe(false);
    expect(component.tarjetaAtenuada(4)).toBe(true);
    expect(component.grosorRelacion(primeraRelacion)).toBe(2);
    expect(component.opacidadRelacion(primeraRelacion)).toBe(1);
    expect(component.grosorRelacion(segundaRelacion)).toBe(2);
    expect(component.opacidadRelacion(segundaRelacion)).toBe(1);
    expect(component.grosorRelacion(terceraRelacion)).toBe(1.5);
    expect(component.opacidadRelacion(terceraRelacion)).toBe(0.12);

    component.hoverId.set(2);
    expect(component.tarjetaAtenuada(1)).toBe(false);
    expect(component.tarjetaAtenuada(2)).toBe(false);
    expect(component.tarjetaAtenuada(3)).toBe(false);
    expect(component.tarjetaAtenuada(4)).toBe(true);
  });

  it('updates hover state for mouse and keyboard focus events', () => {
    const fixture = create();
    const firstCard = fixture.nativeElement.querySelector('[tabindex="0"]') as HTMLElement;

    firstCard.dispatchEvent(new Event('mouseenter'));
    expect(fixture.componentInstance.hoverId()).toBe(1);
    firstCard.dispatchEvent(new Event('mouseleave'));
    expect(fixture.componentInstance.hoverId()).toBeNull();
    firstCard.dispatchEvent(new Event('focus'));
    expect(fixture.componentInstance.hoverId()).toBe(1);
    firstCard.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.hoverId()).toBeNull();
  });

  it('uses TI marker and design-system classes for relationship arrows', () => {
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;
    const relationshipPaths = element.querySelectorAll('path[marker-end]');
    const marker = element.querySelector('marker');
    const arrowhead = marker?.querySelector('path');

    expect(relationshipPaths).toHaveLength(3);
    expect(marker?.id).toBe('mapaFlechaTi');
    expect(
      Array.from(relationshipPaths).every(
        (path) =>
          path.classList.contains('stroke-primary') &&
          path.getAttribute('marker-end') === 'url(#mapaFlechaTi)',
      ),
    ).toBe(true);
    expect(arrowhead?.classList).toContain('fill-primary');
  });
});
