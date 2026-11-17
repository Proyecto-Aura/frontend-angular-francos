import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  SERIE_FORM_VACIO,
  SerieForm,
  serieFormDe,
} from '../interfaces/serie-comprobante.interface';
import { toSerieComprobante } from '../mappers/serie-comprobante.mapper';
import { makePaginaSeriesDto, makeSerieDto } from '../testing/serie-fixtures';
import { SeriesComprobanteService } from './series-comprobante.service';

const URL = `${environment.apiUrl}/series-comprobante`;

describe('SeriesComprobanteService', () => {
  let service: SeriesComprobanteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeriesComprobanteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar() pide la primera página con el máximo y convierte las series', () => {
    let codigos: string[] = [];
    service.listar().subscribe((s) => (codigos = s.map((x) => x.codigo)));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('100');
    expect(req.request.params.has('tipo')).toBe(false);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush(makePaginaSeriesDto([makeSerieDto(), makeSerieDto({ id: 2, serie: 'B001' })]));

    expect(codigos).toEqual(['F001', 'B001']);
  });

  it('crear() envía la serie al backend', () => {
    const form: SerieForm = { ...SERIE_FORM_VACIO, serie: 'f002', inicio: '1', fin: '5000' };
    let codigo = '';
    service.crear(form).subscribe((s) => (codigo = s.codigo));

    const req = http.expectOne({ method: 'POST', url: URL });
    expect(req.request.body).toEqual({
      tipo: 'factura',
      serie: 'F002',
      correlativo_inicio: 1,
      correlativo_fin: 5000,
      estado: true,
    });
    req.flush(makeSerieDto({ serie: 'F002' }));

    expect(codigo).toBe('F002');
  });

  describe('editar()', () => {
    const original = toSerieComprobante(makeSerieDto({ correlativo_fin: 5000 }));

    it('manda PATCH solo con lo que cambió', () => {
      const form = { ...serieFormDe(original), fin: '9000' };
      service.editar(original, form).subscribe();

      const req = http.expectOne({ method: 'PATCH', url: `${URL}/1` });
      expect(req.request.body).toEqual({ correlativo_fin: 9000 });
      req.flush(makeSerieDto({ correlativo_fin: 9000 }));
    });

    it('si no cambió nada no llama al backend', () => {
      let resultado: unknown;
      service.editar(original, serieFormDe(original)).subscribe((s) => (resultado = s));

      expect(resultado).toBe(original);
    });
  });

  it('desactivar() usa DELETE y activar() usa PATCH /activate', () => {
    let activa: boolean | undefined;
    service.desactivar(1).subscribe((s) => (activa = s.activa));
    http.expectOne({ method: 'DELETE', url: `${URL}/1` }).flush(makeSerieDto({ estado: false }));
    expect(activa).toBe(false);

    service.activar(1).subscribe((s) => (activa = s.activa));
    http.expectOne({ method: 'PATCH', url: `${URL}/1/activate` }).flush(makeSerieDto());
    expect(activa).toBe(true);
  });
});
