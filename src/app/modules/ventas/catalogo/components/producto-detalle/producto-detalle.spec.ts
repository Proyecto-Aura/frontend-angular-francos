import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilaCatalogo } from '../../interfaces/producto.interface';
import { ProductoDetalle } from './producto-detalle';

function makeFila(overrides: Partial<FilaCatalogo> = {}): FilaCatalogo {
  return {
    productoId: 1,
    presentacionId: 2,
    productoPresentacionId: 11,
    nombre: 'Chifles clásicos',
    categoria: 'Chifles',
    destacado: false,
    presentacion: '100 gr',
    precioUnit: 5.5,
    precioMayor: 4.2,
    umbral: 24,
    promo: null,
    estado: 'Activo',
    stock: 480,
    visible: false,
    sku: 'FR-P1-PR2',
    slug: 'chifles-clasicos-100-gr-p2',
    imagen: '',
    ...overrides,
  };
}

describe('ProductoDetalle', () => {
  let fixture: ComponentFixture<ProductoDetalle>;
  let el: HTMLElement;

  const mostrar = (fila: FilaCatalogo) => {
    fixture.componentRef.setInput('fila', fila);
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProductoDetalle] });
    fixture = TestBed.createComponent(ProductoDetalle);
    el = fixture.nativeElement as HTMLElement;
  });

  it('no muestra un segundo interruptor "Visible en Portal B": el estado Activo/Desactivado es el único', () => {
    mostrar(makeFila({ estado: 'Activo', visible: false }));

    expect(el.textContent).not.toContain('Visible en Portal B');
    expect(el.textContent).toContain('Activo');
  });

  it('ofrece "Desactivar" si la presentación está activa', () => {
    mostrar(makeFila({ estado: 'Activo' }));

    expect(boton('Desactivar')).toBeDefined();
    expect(boton('Activar')).toBeUndefined();
  });

  it('ofrece "Activar" si la presentación está desactivada y emite la fila al pulsarlo', () => {
    const fila = makeFila({ estado: 'Inactivo' });
    const emitidas: FilaCatalogo[] = [];
    fixture.componentInstance.alternarEstado.subscribe((f) => emitidas.push(f));
    mostrar(fila);

    expect(boton('Desactivar')).toBeUndefined();
    boton('Activar')!.click();

    expect(emitidas).toEqual([fila]);
  });
});
