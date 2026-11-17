import { TestBed } from '@angular/core/testing';
import { crearAlertaTemporal } from './alerta-temporal';

describe('crearAlertaTemporal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('mantiene el ultimo aviso durante 4500 ms completos aunque reemplace otro', () => {
    const alertas = TestBed.runInInjectionContext(() => crearAlertaTemporal());
    alertas.mostrar('success', 'Plan registrado', 'PE-001');
    vi.advanceTimersByTime(3000);
    alertas.mostrar('error', 'No se pudo guardar');
    vi.advanceTimersByTime(1500);
    expect(alertas.toast()?.tone).toBe('error');
    vi.advanceTimersByTime(3000);
    expect(alertas.toast()).toBeNull();
  });
  it('limpia el aviso y cancela el temporizador al destruir la vista', () => {
    const limpiarEstado = vi.fn();
    const alertas = TestBed.runInInjectionContext(() => crearAlertaTemporal(limpiarEstado));
    alertas.mostrar('warning', 'Faltan campos');
    limpiarEstado.mockClear();
    TestBed.resetTestingModule();
    expect(alertas.toast()).toBeNull();
    expect(limpiarEstado).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(4500);
    expect(limpiarEstado).toHaveBeenCalledTimes(1);
  });
});
