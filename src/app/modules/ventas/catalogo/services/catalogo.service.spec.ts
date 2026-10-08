import { TestBed } from '@angular/core/testing';
import {
  ProductoFormModel,
  presentacionVacia,
  productoFormVacio,
} from '../interfaces/producto.interface';
import { CatalogoService } from './catalogo.service';

function makeFormValido(overrides: Partial<ProductoFormModel> = {}): ProductoFormModel {
  return {
    ...productoFormVacio('Chifles'),
    nombre: 'Chifles BBQ',
    descripcion: 'Sabor BBQ.',
    presentaciones: [
      {
        ...presentacionVacia(),
        nombre: 'Bolsa 100 g',
        precioUnit: '6',
        precioMayor: '5',
        umbral: '12',
      },
    ],
    ...overrides,
  };
}

describe('CatalogoService', () => {
  let service: CatalogoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogoService);
  });

  describe('productos', () => {
    it('exposes one catalog row per presentation', () => {
      expect(service.productos()).toHaveLength(7);
      expect(service.filas()).toHaveLength(9);
    });

    it('lists the category names for the filter', () => {
      expect(service.categorias()).toHaveLength(7);
      expect(service.categorias()).toContain('Chifles');
    });

    it('registers a product with the next id and one SKU per presentation', () => {
      const form = makeFormValido();
      form.presentaciones.push({
        ...presentacionVacia(),
        nombre: 'Pack x6',
        precioUnit: '30',
        precioMayor: '25',
        umbral: '6',
      });

      const aviso = service.registrar(form);

      expect(service.productos()).toHaveLength(8);
      expect(service.productos()[7].id).toBe(8);
      expect(service.productos()[7].presentaciones.map((p) => p.id)).toEqual([1, 2]);
      expect(aviso).toContain('Producto registrado');
      expect(aviso).toContain('FR-P8-PR1, FR-P8-PR2');
      expect(aviso).toContain('visible en Portal B inicia desactivado');
    });

    it('updates a product keeping its id and SKUs', () => {
      const form = makeFormValido({ nombre: 'Chifles clásicos XL' });
      form.presentaciones[0].id = 1;

      const aviso = service.actualizar(1, form);

      const producto = service.productos().find((p) => p.id === 1);
      expect(producto?.nombre).toBe('Chifles clásicos XL');
      expect(producto?.presentaciones[0].id).toBe(1);
      expect(aviso).toBe('Producto actualizado · el SKU y el slug se mantienen sin cambios.');
    });

    it('does not touch other products when updating one', () => {
      const antes = service.productos().find((p) => p.id === 2);

      service.actualizar(1, makeFormValido());

      expect(service.productos().find((p) => p.id === 2)).toBe(antes);
    });

    it('deactivates and reactivates a presentation logically', () => {
      const desactivar = service.alternarEstadoPresentacion(1, 1);
      expect(service.filas().find((f) => f.sku === 'FR-P1-PR1')?.estado).toBe('Inactivo');
      expect(desactivar).toBe('Presentación FR-P1-PR1 desactivada de forma lógica.');

      const reactivar = service.alternarEstadoPresentacion(1, 1);
      expect(service.filas().find((f) => f.sku === 'FR-P1-PR1')?.estado).toBe('Activo');
      expect(reactivar).toBe('Presentación FR-P1-PR1 reactivada.');
      expect(service.filas()).toHaveLength(9);
    });
  });

  describe('configuración: validarCfg', () => {
    it('requires name and description for categories', () => {
      expect(service.validarCfg('categorias', null, { nombre: '', descripcion: '' })).toEqual([
        'nombre',
        'descripción',
      ]);
    });

    it('rejects a duplicated name ignoring case', () => {
      const errores = service.validarCfg('categorias', null, {
        nombre: 'chifles',
        descripcion: 'x',
      });

      expect(errores).toEqual(['el nombre ya está registrado']);
    });

    it('allows keeping the name of the record being edited', () => {
      const errores = service.validarCfg('categorias', 1, {
        nombre: 'Chifles',
        descripcion: 'x',
      });

      expect(errores).toEqual([]);
    });
  });

  describe('configuración: guardarCfg', () => {
    it('adds an active category with the next id', () => {
      const aviso = service.guardarCfg('categorias', null, {
        nombre: 'Panadería',
        descripcion: 'Productos de panadería.',
      });

      expect(service.categoriasCfg()).toHaveLength(8);
      expect(service.categoriasCfg()[7]).toEqual({
        id: 8,
        nombre: 'Panadería',
        descripcion: 'Productos de panadería.',
        estado: 'Activo',
      });
      expect(aviso).toBe(
        'Categoría Panadería registrada · disponible en los selectores de producto.',
      );
    });

    it('renames a category in the products that use it', () => {
      const aviso = service.guardarCfg('categorias', 1, {
        nombre: 'Chifles y más',
        descripcion: 'Nueva descripción.',
      });

      expect(service.categoriasCfg()[0].nombre).toBe('Chifles y más');
      expect(service.productos().filter((p) => p.categoria === 'Chifles y más')).toHaveLength(2);
      expect(service.productos().filter((p) => p.categoria === 'Chifles')).toHaveLength(0);
      expect(aviso).toBe('Categoría Chifles y más actualizada.');
    });

    it('edits a presentation without changing its state', () => {
      service.guardarCfg('presentaciones', 8, {
        nombre: 'Display x30',
        descripcion: 'Display de 30.',
      });

      const edited = service.presentacionesCfg().find((x) => x.id === 8);
      expect(edited?.nombre).toBe('Display x30');
      expect(edited?.estado).toBe('Inactivo');
    });
  });

  describe('configuración: alternarCfg', () => {
    it('deactivates an active record explaining that products keep it', () => {
      const aviso = service.alternarCfg('categorias', 1);

      expect(service.categoriasCfg()[0].estado).toBe('Inactivo');
      expect(aviso).toBe(
        'Categoría Chifles desactivada · ya no aparece en nuevos registros y se mantiene en los productos existentes.',
      );
    });

    it('reactivates an inactive presentation', () => {
      const aviso = service.alternarCfg('presentaciones', 8);

      expect(service.presentacionesCfg().find((x) => x.id === 8)?.estado).toBe('Activo');
      expect(aviso).toBe('Presentación Display x24 reactivada.');
    });

    it('returns an empty notice when the record does not exist', () => {
      expect(service.alternarCfg('categorias', 999)).toBe('');
    });
  });

  describe('configuración: usosDe', () => {
    it('counts presentations of the products in a category', () => {
      const chifles = service.categoriasCfg()[0];

      expect(service.usosDe('categorias', chifles)).toBe(3);
    });

    it('counts products that use a presentation name', () => {
      const bolsa100 = service.presentacionesCfg()[0];

      expect(service.usosDe('presentaciones', bolsa100)).toBe(2);
    });
  });

  describe('lista', () => {
    it('returns the list that matches the tab', () => {
      expect(service.lista('categorias')).toBe(service.categoriasCfg());
      expect(service.lista('presentaciones')).toBe(service.presentacionesCfg());
    });
  });
});
