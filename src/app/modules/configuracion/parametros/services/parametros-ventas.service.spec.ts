import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ParametrosVentasService } from './parametros-ventas.service';

const PARAMETROS = `${environment.apiUrl}/parametros-ventas`;
const PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;
const PROMOCIONES = `${environment.apiUrl}/promociones`;

const PARAMETROS_DTO = {
  umbral_mayorista_global: 24,
  umbral_por_producto: true,
  promociones_activas: true,
  culqi_activo: true,
  efectivo_activo: true,
  updated_at: '2026-11-14T10:00:00Z',
};

describe('ParametrosVentasService', () => {
  let service: ParametrosVentasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ParametrosVentasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtener() lee los parámetros', () => {
    let umbral = 0;
    service.obtener().subscribe((p) => (umbral = p.umbralGlobal));

    const req = http.expectOne(PARAMETROS);
    expect(req.request.method).toBe('GET');
    req.flush(PARAMETROS_DTO);

    expect(umbral).toBe(24);
  });

  it('actualizar() hace PATCH solo con los campos que cambiaron', () => {
    let umbral = 0;
    service.actualizar({ umbralGlobal: 36 }).subscribe((p) => (umbral = p.umbralGlobal));

    const req = http.expectOne(PARAMETROS);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ umbral_mayorista_global: 36 });
    req.flush({ ...PARAMETROS_DTO, umbral_mayorista_global: 36 });

    expect(umbral).toBe(36);
  });

  it('listarPresentaciones() pide solo las que tienen precio mayorista, con página y búsqueda', () => {
    let nombres: string[] = [];
    service
      .listarPresentaciones(2, ' chifles ')
      .subscribe((p) => (nombres = p.items.map((i) => i.producto)));

    const req = http.expectOne((r) => r.url === PRESENTACIONES);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('con_mayorista')).toBe('true');
    expect(req.request.params.get('search')).toBe('chifles');
    req.flush({
      data: [
        {
          id: 7,
          sku: 'FR-CHI-250',
          precio_mayorista: 4.2,
          umbral_mayorista: null,
          producto: { nombre: 'Chifles' },
          presentacion: { cantidad: 250, unidad_medida: 'gr' },
        },
      ],
      meta: { total: 1, page: 2, limit: 10, total_pages: 1 },
    });

    expect(nombres).toEqual(['Chifles']);
  });

  it('listarPresentaciones() no manda search si no hay búsqueda', () => {
    service.listarPresentaciones().subscribe();

    const req = http.expectOne((r) => r.url === PRESENTACIONES);
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('actualizarUmbralPresentacion() manda el umbral, o null para quitarlo', () => {
    service.actualizarUmbralPresentacion(7, 12).subscribe();
    const conValor = http.expectOne(`${PRESENTACIONES}/7`);
    expect(conValor.request.method).toBe('PATCH');
    expect(conValor.request.body).toEqual({ umbral_mayorista: 12 });
    conValor.flush({});

    service.actualizarUmbralPresentacion(8, null).subscribe();
    const sinValor = http.expectOne(`${PRESENTACIONES}/8`);
    expect(sinValor.request.body).toEqual({ umbral_mayorista: null });
    sinValor.flush({});
  });

  it('listarPromociones() devuelve las promociones ya traducidas', () => {
    let nombres: string[] = [];
    service.listarPromociones().subscribe((lista) => (nombres = lista.map((p) => p.nombre)));

    const req = http.expectOne((r) => r.url === PROMOCIONES);
    expect(req.request.params.get('limit')).toBe('50');
    req.flush({
      data: [
        {
          id: 1,
          nombre: '2x1 en chifles',
          tipo: 'nxm',
          fecha_inicio: '2026-11-01',
          fecha_fin: '2026-11-30',
          estado: true,
          vigente: true,
        },
      ],
      meta: { total: 1, page: 1, limit: 50, total_pages: 1 },
    });

    expect(nombres).toEqual(['2x1 en chifles']);
  });
});
