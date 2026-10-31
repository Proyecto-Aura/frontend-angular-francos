import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SerieComprobante } from '../../interfaces/serie-comprobante.interface';
import { toSerieComprobante } from '../../mappers/serie-comprobante.mapper';
import { makeSerieDto } from '../../testing/serie-fixtures';
import { SerieDesactivarModal } from './serie-desactivar-modal';

const URL = `${environment.apiUrl}/series-comprobante/1`;

describe('SerieDesactivarModal', () => {
  let fixture: ComponentFixture<SerieDesactivarModal>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let desactivadas: SerieComprobante[];
  let cierres: number;

  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SerieDesactivarModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SerieDesactivarModal);
    el = fixture.nativeElement as HTMLElement;
    desactivadas = [];
    cierres = 0;
    fixture.componentInstance.deactivated.subscribe((s) => desactivadas.push(s));
    fixture.componentInstance.closed.subscribe(() => cierres++);
    fixture.componentRef.setInput('serie', toSerieComprobante(makeSerieDto()));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('explica que la serie conserva su correlativo y cuál fue el último emitido', () => {
    expect(el.textContent).toContain('Desactivar serie');
    expect(el.textContent).toContain('La serie F001 dejará de estar disponible para emitir');
    expect(el.textContent).toContain('último emitido: 00001847');
  });

  it('al confirmar desactiva la serie, avisa y cierra', () => {
    boton('Desactivar').click();
    http.expectOne({ method: 'DELETE', url: URL }).flush(makeSerieDto({ estado: false }));

    expect(desactivadas).toHaveLength(1);
    expect(desactivadas[0].activa).toBe(false);
    expect(cierres).toBe(1);
  });

  it('muestra el error si no se pudo desactivar y se queda abierto', () => {
    boton('Desactivar').click();
    http
      .expectOne({ method: 'DELETE', url: URL })
      .flush({ message: 'Serie no encontrada' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Serie no encontrada');
    expect(cierres).toBe(0);
  });

  it('Cancelar cierra sin llamar al backend', () => {
    boton('Cancelar').click();

    expect(cierres).toBe(1);
    http.expectNone(URL);
  });
});
