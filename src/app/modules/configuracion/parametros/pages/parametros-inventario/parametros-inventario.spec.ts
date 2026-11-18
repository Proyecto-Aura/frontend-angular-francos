import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import { ParametrosInventario } from './parametros-inventario';

const PRODUCTO_PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;

describe('ParametrosInventario', () => {
  let fixture: ComponentFixture<ParametrosInventario>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ParametrosInventario],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ParametrosInventario);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra el título y carga los productos terminados por defecto', () => {
    http
      .expectOne((r) => r.url === PRODUCTO_PRESENTACIONES)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 1 } });
    fixture.detectChanges();

    expect(el.querySelector('h1')?.textContent).toContain('Parámetros de inventario');
    expect(el.querySelector('app-stock-minimo-panel')).not.toBeNull();
    expect(el.textContent).toContain('Sin resultados');
  });

  it('si la carga falla muestra el error con reintento', () => {
    http
      .expectOne((r) => r.url === PRODUCTO_PRESENTACIONES)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Reintentar');
  });
});
