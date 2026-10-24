import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../../environments/environment';
import { Button } from '../../../../../shared/ds/button/button';
import { Kpi } from '../../../negocio/interfaces/kpi.interface';
import { KpiTiEliminarModal } from './kpi-ti-eliminar-modal';

const KPI_URL = `${environment.apiUrl}/kpis-ti/10`;

function makeKpi(): Kpi {
  return {
    id: 10,
    codigo: 'PE-0005-KPI-TI-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    objetivoId: 20,
    objetivoNombre: 'Rentabilidad',
    objetivoResponsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    frecuenciaId: 2,
    frecuenciaNombre: 'Trimestral',
    unidadId: 3,
    unidadSimbolo: '%',
    metaFinal: 30,
    metas: [],
    ultimoValor: null,
  };
}

describe('KpiTiEliminarModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<KpiTiEliminarModal> {
    const fixture = TestBed.createComponent(KpiTiEliminarModal);
    fixture.componentRef.setInput('kpi', makeKpi());
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function deleteButton(fixture: ComponentFixture<KpiTiEliminarModal>): Button {
    const debug = fixture.debugElement
      .queryAll(By.directive(Button))
      .find((item) => (item.componentInstance as Button).variant() === 'destructive');
    if (!debug) throw new Error('Delete button not found');
    return debug.componentInstance as Button;
  }

  it('shows the KPI name and code and emits deleted after deletion', () => {
    const fixture = create();
    let deleted = 0;
    let closed = 0;
    fixture.componentInstance.deleted.subscribe(() => deleted++);
    fixture.componentInstance.closed.subscribe(() => closed++);

    expect(fixture.nativeElement.textContent).toContain('«Margen operativo» (PE-0005-KPI-TI-001)');
    fixture.componentInstance.eliminar();
    const req = httpMock.expectOne(KPI_URL);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(deleted).toBe(1);
    expect(closed).toBe(1);
  });

  it('shows the backend message for a conflict response', () => {
    const fixture = create();
    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(KPI_URL)
      .flush(
        { statusCode: 409, message: 'El KPI no se puede eliminar' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe('El KPI no se puede eliminar');
  });

  it('shows a not-found message for a 404 response', () => {
    const fixture = create();
    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(KPI_URL)
      .flush({ statusCode: 404, message: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.errorGeneral()).toBe('El KPI ya no existe.');
  });

  it.each([401, 403])('shows a permission error for status %s', (status) => {
    const fixture = create();
    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(KPI_URL)
      .flush({ statusCode: status, message: 'Forbidden' }, { status, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe('No tiene permisos para gestionar KPIs.');
  });

  it('shows a generic error for an unexpected response', () => {
    const fixture = create();
    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(KPI_URL)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo eliminar el KPI. Intente nuevamente.',
    );
  });

  it('disables the delete button while the request is pending', () => {
    const fixture = create();
    fixture.componentInstance.eliminar();
    fixture.detectChanges();

    expect(deleteButton(fixture).disabled()).toBe(true);
    httpMock.expectOne(KPI_URL).flush(null);
  });

  it('clears a previous error when reopened', () => {
    const fixture = create();
    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(KPI_URL)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );
    expect(fixture.componentInstance.errorGeneral()).not.toBeNull();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorGeneral()).toBeNull();
  });
});
