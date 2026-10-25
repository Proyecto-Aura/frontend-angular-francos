import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { EmpresaDto } from '../interfaces/empresa-dto.interface';
import { EmpresaForm } from '../interfaces/empresa.interface';
import { EmpresaService } from './empresa.service';

const EMPRESA_URL = `${environment.apiUrl}/empresa`;
const LOGO_URL = `${environment.apiUrl}/empresa/logo`;

function makeDto(overrides: Partial<EmpresaDto> = {}): EmpresaDto {
  return {
    id: 1,
    razon_social: 'Franco SAC',
    ruc: '20548712345',
    direccion: 'Av. Principal 100',
    telefono: '012345678',
    email: 'facturacion@franco.pe',
    logo_url: 'http://media.test/empresa/logo.png',
    estado: true,
    es_emisora: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('EmpresaService', () => {
  let service: EmpresaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpresaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtener() convierte la respuesta al modelo de la pantalla', () => {
    let resultado: unknown;
    service.obtener().subscribe((empresa) => (resultado = empresa));

    http.expectOne({ method: 'GET', url: EMPRESA_URL }).flush(makeDto());

    expect(resultado).toEqual({
      razonSocial: 'Franco SAC',
      ruc: '20548712345',
      direccion: 'Av. Principal 100',
      telefono: '012345678',
      email: 'facturacion@franco.pe',
      logoUrl: 'http://media.test/empresa/logo.png',
    });
  });

  it('obtener() devuelve null si todavía no hay empresa (404)', () => {
    let resultado: unknown = 'sin-respuesta';
    service.obtener().subscribe((empresa) => (resultado = empresa));

    http
      .expectOne(EMPRESA_URL)
      .flush(
        { message: 'Empresa emisora no configurada' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(resultado).toBeNull();
  });

  it('obtener() propaga los errores que no son 404', () => {
    let status = 0;
    service.obtener().subscribe({ error: (err: { status: number }) => (status = err.status) });

    http.expectOne(EMPRESA_URL).flush({}, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });

  it('guardar() envía PUT sin espacios en el teléfono y sin logo', () => {
    const form: EmpresaForm = {
      razonSocial: '  Franco SAC ',
      ruc: '20548712345',
      direccion: ' Av. Principal 100 ',
      telefono: '01 234 5678',
      email: ' facturacion@franco.pe ',
    };
    service.guardar(form).subscribe();

    const req = http.expectOne({ method: 'PUT', url: EMPRESA_URL });
    expect(req.request.body).toEqual({
      razon_social: 'Franco SAC',
      ruc: '20548712345',
      direccion: 'Av. Principal 100',
      telefono: '012345678',
      email: 'facturacion@franco.pe',
    });
    expect('logo_url' in (req.request.body as object)).toBe(false);
    req.flush(makeDto());
  });

  it('guardar() omite teléfono y email vacíos', () => {
    service
      .guardar({
        razonSocial: 'Franco SAC',
        ruc: '20548712345',
        direccion: 'Av. Principal 100',
        telefono: '',
        email: '',
      })
      .subscribe();

    const req = http.expectOne({ method: 'PUT', url: EMPRESA_URL });
    expect(req.request.body).toEqual({
      razon_social: 'Franco SAC',
      ruc: '20548712345',
      direccion: 'Av. Principal 100',
    });
    req.flush(makeDto({ telefono: null, email: null }));
  });

  it('subirLogo() envía el archivo como multipart en el campo "logo"', () => {
    const archivo = new File(['x'], 'logo.png', { type: 'image/png' });
    service.subirLogo(archivo).subscribe();

    const req = http.expectOne({ method: 'POST', url: LOGO_URL });
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('logo')).toBe(archivo);
    req.flush(makeDto());
  });

  it('quitarLogo() llama a DELETE /empresa/logo', () => {
    let logoUrl: string | null = 'x';
    service.quitarLogo().subscribe((empresa) => (logoUrl = empresa.logoUrl));

    http.expectOne({ method: 'DELETE', url: LOGO_URL }).flush(makeDto({ logo_url: null }));

    expect(logoUrl).toBeNull();
  });
});
