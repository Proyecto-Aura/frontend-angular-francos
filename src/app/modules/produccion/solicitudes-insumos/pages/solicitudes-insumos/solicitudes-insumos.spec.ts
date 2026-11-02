import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitudesInsumos } from './solicitudes-insumos';

describe('SolicitudesInsumos', () => {
  let component: SolicitudesInsumos;
  let fixture: ComponentFixture<SolicitudesInsumos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesInsumos],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesInsumos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
