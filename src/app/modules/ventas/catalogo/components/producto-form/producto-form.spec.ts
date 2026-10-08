import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectOption } from '../../../../../shared/ds/select/select';
import { PresentacionForm, ProductoFormModel } from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { ProductoForm } from './producto-form';

// Los miembros del componente son `protected`: el spec los consulta mediante esta vista tipada.
interface ProductoFormApi {
  pf: { (): ProductoFormModel; set(v: ProductoFormModel): void };
  errores: Signal<string[]>;
  titulo: Signal<string>;
  categoriaOptions: Signal<SelectOption[]>;
  setCampo(campo: 'nombre' | 'categoria' | 'descripcion', valor: string): void;
  setPres<K extends keyof PresentacionForm>(
    idx: number,
    campo: K,
    valor: PresentacionForm[K],
  ): void;
  agregarPres(): void;
  quitarPres(idx: number): void;
  adjuntar(idx: number): void;
  extension(imagen: string): string;
  skuDePresentacion(p: PresentacionForm): string;
  guardar(): void;
  cerrar(): void;
}

describe('ProductoForm', () => {
  let fixture: ComponentFixture<ProductoForm>;
  let service: CatalogoService;
  let guardados: string[];
  let cierres: number;

  function api(): ProductoFormApi {
    return fixture.componentInstance as unknown as ProductoFormApi;
  }

  function abrir(modo: 'nuevo' | 'editar' | null, productoId?: number): void {
    fixture.componentRef.setInput('modo', modo);
    if (productoId !== undefined) {
      fixture.componentRef.setInput(
        'producto',
        service.productos().find((p) => p.id === productoId) ?? null,
      );
    }
    fixture.detectChanges();
  }

  function completarFormulario(): void {
    api().setCampo('nombre', 'Chifles BBQ');
    api().setCampo('descripcion', 'Sabor BBQ.');
    api().setPres(0, 'nombre', 'Bolsa 100 g');
    api().setPres(0, 'precioUnit', '6');
    api().setPres(0, 'precioMayor', '5');
    api().setPres(0, 'umbral', '12');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogoService);
    fixture = TestBed.createComponent(ProductoForm);
    guardados = [];
    cierres = 0;
    fixture.componentInstance.guardado.subscribe((aviso) => guardados.push(aviso));
    fixture.componentInstance.closed.subscribe(() => cierres++);
  });

  it('opens an empty form with the first active category', () => {
    abrir('nuevo');

    expect(api().titulo()).toBe('Registrar producto');
    expect(api().pf().nombre).toBe('');
    expect(api().pf().categoria).toBe('Chifles');
    expect(api().pf().presentaciones).toHaveLength(1);
    expect(api().errores()).toEqual([]);
  });

  it('loads the product to edit', () => {
    abrir('editar', 1);

    expect(api().titulo()).toBe('Editar producto');
    expect(api().pf().nombre).toBe('Chifles clásicos');
    expect(api().pf().presentaciones).toHaveLength(2);
    expect(api().pf().presentaciones[0].precioUnit).toBe('5.5');
  });

  it('adds and removes presentations', () => {
    abrir('nuevo');

    api().agregarPres();
    expect(api().pf().presentaciones).toHaveLength(2);

    api().quitarPres(0);
    expect(api().pf().presentaciones).toHaveLength(1);
  });

  it('shows the generated SKU only when editing', () => {
    abrir('editar', 1);
    expect(api().skuDePresentacion(api().pf().presentaciones[1])).toBe('FR-P1-PR2');

    abrir('nuevo');
    expect(api().skuDePresentacion(api().pf().presentaciones[0])).toBe(
      'SKU asignado automáticamente al guardar',
    );
  });

  it('simulates the image attachment from the product name', () => {
    abrir('nuevo');
    api().setCampo('nombre', 'Chifles Clásicos');

    api().adjuntar(0);

    expect(api().pf().presentaciones[0].imagen).toBe('chifles-clasicos-1.jpg');
    expect(api().extension('chifles-clasicos-1.jpg')).toBe('JPG');
  });

  it('keeps an inactive category visible only when it is the current one', () => {
    abrir('nuevo');
    expect(
      api()
        .categoriaOptions()
        .map((o) => o.value),
    ).not.toContain('Temporada');

    api().setCampo('categoria', 'Temporada');

    const opcion = api()
      .categoriaOptions()
      .find((o) => o.value === 'Temporada');
    expect(opcion?.label).toBe('Temporada (inactiva)');
  });

  it('does not save and lists the missing fields when the form is invalid', () => {
    abrir('nuevo');

    api().guardar();

    expect(api().errores()).toContain('nombre del producto');
    expect(guardados).toEqual([]);
    expect(cierres).toBe(0);
    expect(service.productos()).toHaveLength(7);
  });

  it('registers a valid product, emits the notice and closes', () => {
    abrir('nuevo');
    completarFormulario();

    api().guardar();

    expect(service.productos()).toHaveLength(8);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toContain('Producto registrado · SKU FR-P8-PR1');
    expect(cierres).toBe(1);
  });

  it('updates the edited product, emits the notice and closes', () => {
    abrir('editar', 1);
    api().setCampo('nombre', 'Chifles clásicos XL');

    api().guardar();

    expect(service.productos()).toHaveLength(7);
    expect(service.productos().find((p) => p.id === 1)?.nombre).toBe('Chifles clásicos XL');
    expect(guardados).toEqual([
      'Producto actualizado · el SKU y el slug se mantienen sin cambios.',
    ]);
    expect(cierres).toBe(1);
  });

  it('closes without saving', () => {
    abrir('nuevo');

    api().cerrar();

    expect(cierres).toBe(1);
    expect(guardados).toEqual([]);
  });
});
