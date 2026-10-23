import { toReembolsoDetalle } from '../mappers/reembolso.mapper';
import { makeReembolsoDetalleDto } from '../testing/reembolsos.fixtures';
import { ReembolsoDetalle, estadoReembolsoLabel, trazaDe } from './reembolso.interface';

describe('reembolso.interface', () => {
  const detalle = (overrides: Partial<ReembolsoDetalle> = {}): ReembolsoDetalle => ({
    ...toReembolsoDetalle(makeReembolsoDetalleDto()),
    ...overrides,
  });

  const labels = (d: ReembolsoDetalle) => trazaDe(d).map((p) => p.label);

  it('labels every refund state', () => {
    expect(estadoReembolsoLabel('pendiente')).toBe('Pendiente');
    expect(estadoReembolsoLabel('reembolsado')).toBe('Reembolsado');
  });

  describe('trazaDe', () => {
    it('is empty while the request is pending', () => {
      expect(trazaDe(detalle())).toEqual([]);
    });

    it('shows the refund sent to Culqi after approving a Culqi payment', () => {
      expect(labels(detalle({ estado: 'aprobado' }))).toEqual([
        'Solicitud aprobada',
        'Devolución enviada a Culqi',
      ]);
    });

    it('shows only the approval for a cash payment', () => {
      expect(
        labels(detalle({ estado: 'aprobado', metodo: 'efectivo', metodoLabel: 'Efectivo' })),
      ).toEqual(['Solicitud aprobada']);
    });

    it('shows the Culqi confirmation once refunded', () => {
      expect(labels(detalle({ estado: 'reembolsado' }))).toEqual([
        'Solicitud aprobada',
        'Devolución confirmada por Culqi',
      ]);
    });

    it('shows the rejection and its reason', () => {
      const pasos = trazaDe(
        detalle({ estado: 'rechazado', motivoRechazo: 'Fuera del plazo de 48 horas.' }),
      );

      expect(pasos.map((p) => p.label)).toEqual(['Solicitud rechazada', 'Motivo del rechazo']);
      expect(pasos[1].detalle).toBe('Fuera del plazo de 48 horas.');
    });
  });
});
