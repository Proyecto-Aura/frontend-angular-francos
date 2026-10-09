import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  API,
  CATEGORIAS_CFG_DTO,
  flushCategoriasCfg,
  makePresentacion,
  makeProducto,
} from '../testing/catalogo.fixtures';
import { CatalogoService } from './catalogo.service';
import { ConfiguracionCatalogoService } from './configuracion-catalogo.service';

describe('ConfiguracionCatalogoService', () => {
  let service: ConfiguracionCatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfiguracionCatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function cargarCategorias() {
    service.cargarCategorias();
    flushCategoriasCfg(httpMock);
  }

  describe('cargarCategorias', () => {
    it('starts without static categories', () => {
      expect(service.categoriasCfg()).toEqual([]);
    });

    it('loads every category (active and inactive) from the API', () => {
      cargarCategorias();

      expect(service.categoriasCfg()).toHaveLength(7);
      expect(service.categoriasCfg()[0]).toEqual({
        id: 1,
        nombre: 'Chifles',
        descripcion: 'Hojuelas de plátano bellaco.',
        estado: 'Activo',
      });
      expect(service.categoriasCfg()[6].estado).toBe('Inactivo');
      expect(service.errorCategorias()).toBe(false);
      expect(service.cargandoCategorias()).toBe(false);
    });

    it('shows an empty description when the API sends null', () => {
      service.cargarCategorias();
      flushCategoriasCfg(httpMock, [{ id: 1, nombre: 'Chifles', descripcion: null, estado: true }]);

      expect(service.categoriasCfg()[0].descripcion).toBe('');
    });

    it('refreshes the category selectors of the product form', () => {
      cargarCategorias();

      const opciones = TestBed.inject(CatalogoService).categoriaOpciones();
      expect(opciones).toHaveLength(7);
      expect(opciones[6]).toEqual({ id: 7, nombre: 'Temporada', activa: false });
    });

    it('flags the error and keeps the list empty when the API fails', () => {
      service.cargarCategorias();
      expect(service.cargandoCategorias()).toBe(true);
      httpMock
        .expectOne((r) => r.url === API.categorias)
        .flush({ message: 'x' }, { status: 500, statusText: 'Error' });

      expect(service.errorCategorias()).toBe(true);
      expect(service.categoriasCfg()).toEqual([]);
      expect(service.cargandoCategorias()).toBe(false);
    });
  });

  describe('validarCfg', () => {
    beforeEach(cargarCategorias);

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

  describe('guardarCfg', () => {
    beforeEach(cargarCategorias);

    it('creates a category through the API and adds it to the list', () => {
      let aviso = '';
      service
        .guardarCfg('categorias', null, { nombre: ' Panadería ', descripcion: 'Productos.' })
        .subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(API.categorias);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ nombre: 'Panadería', descripcion: 'Productos.' });
      req.flush({ id: 8, nombre: 'Panadería', descripcion: 'Productos.', estado: true });

      expect(service.categoriasCfg()).toHaveLength(8);
      expect(service.categoriasCfg()[7]).toEqual({
        id: 8,
        nombre: 'Panadería',
        descripcion: 'Productos.',
        estado: 'Activo',
      });
      expect(aviso).toBe(
        'Categoría Panadería registrada · disponible en los selectores de producto.',
      );
      expect(TestBed.inject(CatalogoService).categoriaOpciones()).toHaveLength(8);
    });

    it('renames a category through the API', () => {
      let aviso = '';
      service
        .guardarCfg('categorias', 1, { nombre: 'Chifles y más', descripcion: 'Nueva.' })
        .subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.categorias}/1`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ id: 1, nombre: 'Chifles y más', descripcion: 'Nueva.', estado: true });

      expect(service.categoriasCfg()[0].nombre).toBe('Chifles y más');
      expect(service.categoriasCfg()).toHaveLength(7);
      expect(aviso).toBe('Categoría Chifles y más actualizada.');
    });

    it('keeps the list and fails when the API rejects the name', () => {
      let error: unknown;
      service
        .guardarCfg('categorias', null, { nombre: 'Chifles', descripcion: 'x' })
        .subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(API.categorias)
        .flush({ message: 'Ya existe' }, { status: 409, statusText: 'Conflict' });

      expect(error).toBeTruthy();
      expect(service.categoriasCfg()).toHaveLength(7);
    });

    it('edits a presentation locally without changing its state (HU-041 pending)', () => {
      service
        .guardarCfg('presentaciones', 8, { nombre: 'Display x30', descripcion: 'Display de 30.' })
        .subscribe();

      const edited = service.presentacionesCfg().find((x) => x.id === 8);
      expect(edited?.nombre).toBe('Display x30');
      expect(edited?.estado).toBe('Inactivo');
    });
  });

  describe('alternarCfg', () => {
    beforeEach(cargarCategorias);

    it('deactivates an active category through the API', () => {
      let aviso = '';
      service.alternarCfg('categorias', 1).subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.categorias}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ ...CATEGORIAS_CFG_DTO[0], estado: false });

      expect(service.categoriasCfg()[0].estado).toBe('Inactivo');
      expect(aviso).toBe(
        'Categoría Chifles desactivada · ya no aparece en nuevos registros y se mantiene en los productos existentes.',
      );
      expect(TestBed.inject(CatalogoService).categoriaOpciones()[0].activa).toBe(false);
    });

    it('reactivates an inactive category through the API', () => {
      let aviso = '';
      service.alternarCfg('categorias', 7).subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.categorias}/7/activate`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...CATEGORIAS_CFG_DTO[6], estado: true });

      expect(service.categoriasCfg()[6].estado).toBe('Activo');
      expect(aviso).toBe('Categoría Temporada reactivada.');
    });

    it('reactivates an inactive presentation locally', () => {
      let aviso = '';
      service.alternarCfg('presentaciones', 8).subscribe((a) => (aviso = a));

      expect(service.presentacionesCfg().find((x) => x.id === 8)?.estado).toBe('Activo');
      expect(aviso).toBe('Presentación Display x24 reactivada.');
    });

    it('emits an empty notice when the record does not exist', () => {
      let aviso: string | undefined;
      service.alternarCfg('categorias', 999).subscribe((a) => (aviso = a));

      expect(aviso).toBe('');
    });
  });

  describe('usosDe', () => {
    beforeEach(() => {
      cargarCategorias();
      TestBed.inject(CatalogoService).productos.set([
        makeProducto({
          id: 1,
          categoria: 'Chifles',
          presentaciones: [
            makePresentacion({ nombre: 'Bolsa 100 g' }),
            makePresentacion({ id: 2, nombre: 'Bolsa 200 g' }),
          ],
        }),
        makeProducto({
          id: 2,
          categoria: 'Chifles',
          presentaciones: [makePresentacion({ nombre: 'Bolsa 100 g' })],
        }),
        makeProducto({ id: 3, categoria: 'Camote', presentaciones: [makePresentacion()] }),
      ]);
    });

    it('counts the presentations of the real products in a category', () => {
      const chifles = service.categoriasCfg()[0];

      expect(service.usosDe('categorias', chifles)).toBe(3);
    });

    it('counts the presentations that use a presentation name', () => {
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
