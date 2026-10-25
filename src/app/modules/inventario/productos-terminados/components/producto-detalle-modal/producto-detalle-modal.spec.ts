import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductoPresentacion } from '../../interfaces/producto-presentacion.interface';
import { ProductoDetalleModal } from './producto-detalle-modal';

function makeProducto(overrides: Partial<ProductoPresentacion> = {}): ProductoPresentacion {
  return {
    id: 7,
    sku: 'FR-P3-PR2',
    productoNombre: 'Pan de molde',
    productoDescripcion: 'Pan de molde integral, bolsa sellada.',
    categoriaId: 2,
    categoriaNombre: 'Panadería',
    presentacionId: 2,
    presentacionCantidad: 500,
    presentacionUnidadMedida: 'gr',
    estado: true,
    stockActual: 45,
    stockMinimo: 10,
    stockMaximo: 300,
    ...overrides,
  };
}

describe('ProductoDetalleModal', () => {
  function create(producto: ProductoPresentacion | null): ComponentFixture<ProductoDetalleModal> {
    const fixture = TestBed.createComponent(ProductoDetalleModal);
    fixture.componentRef.setInput('producto', producto);
    fixture.detectChanges();
    return fixture;
  }

  it('is closed when producto is null', () => {
    const fixture = create(null);
    expect(fixture.componentInstance.campos()).toEqual([]);
  });

  it('starts on the información tab', () => {
    const fixture = create(makeProducto());
    expect(fixture.componentInstance.tabActiva()).toBe('informacion');
  });

  it('builds the campos for a producto, formatting la presentación', () => {
    const fixture = create(makeProducto());

    expect(fixture.componentInstance.campos()).toEqual([
      { label: 'SKU', value: 'FR-P3-PR2' },
      { label: 'Nombre', value: 'Pan de molde' },
      { label: 'Categoría', value: 'Panadería' },
      { label: 'Presentación', value: '500 gr' },
      { label: 'Unidad de medida', value: 'gr' },
      { label: 'Stock actual', value: '45' },
      { label: 'Stock mínimo', value: '10' },
      { label: 'Stock máximo', value: '300' },
      { label: 'Nivel de stock', value: 'Normal' },
      { label: 'Estado', value: 'Activo' },
      { label: 'Descripción', value: 'Pan de molde integral, bolsa sellada.' },
    ]);
  });

  it('shows — for stock máximo y descripción when no tienen dato', () => {
    const fixture = create(makeProducto({ stockMaximo: null, productoDescripcion: null }));

    const campos = fixture.componentInstance.campos();
    expect(campos.find((c) => c.label === 'Stock máximo')?.value).toBe('—');
    expect(campos.find((c) => c.label === 'Descripción')?.value).toBe('—');
  });

  it('computes the nivel badge consistently with calcularNivelStockProducto', () => {
    const fixture = create(makeProducto({ stockActual: 0 }));

    expect(fixture.componentInstance.nivel()).toBe('agotado');
    expect(fixture.componentInstance.nivelLabel()).toBe('Agotado');
    expect(fixture.componentInstance.nivelTone()).toBe('danger');
  });

  it('switches tabs and resets to información on close', () => {
    const fixture = create(makeProducto());
    const component = fixture.componentInstance;

    component.cambiarTab('lotes');
    expect(component.tabActiva()).toBe('lotes');

    const cerrados: void[] = [];
    component.closed.subscribe(() => cerrados.push(undefined));
    component.cerrar();

    expect(component.tabActiva()).toBe('informacion');
    expect(cerrados.length).toBe(1);
  });

  it('gives each tab a navigation icon', () => {
    const fixture = create(makeProducto());
    expect(fixture.componentInstance.tabs.map((t) => !!t.icon)).toEqual([true, true, true]);
  });
});
