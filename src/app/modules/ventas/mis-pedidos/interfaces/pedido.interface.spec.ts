import { makeFormValido, presentacionOpciones } from '../testing/pedidos.fixtures';
import {
  estadoLabel,
  estadoTone,
  metodoPagoLabel,
  precioEstimado,
  subtotalEstimado,
  totalEstimado,
  validarPedido,
} from './pedido.interface';

const [mayorista, simple] = presentacionOpciones;

describe('pedido.interface', () => {
  describe('precioEstimado (RN17)', () => {
    it('charges the unit price up to the threshold and the wholesale price above it', () => {
      expect(precioEstimado(mayorista, 24)).toBe(5.5);
      expect(precioEstimado(mayorista, 25)).toBe(4.2);
    });

    it('charges the unit price when there is no wholesale price', () => {
      expect(precioEstimado(simple, 500)).toBe(9.9);
    });
  });

  describe('totalEstimado (RF-A033)', () => {
    it('adds subtotals without floating point errors', () => {
      expect(subtotalEstimado(simple, 4)).toBe(39.6);
      expect(totalEstimado(makeFormValido(), presentacionOpciones)).toBe(165.6);
    });

    it('ignores rows without product or with an invalid quantity', () => {
      const form = makeFormValido({
        items: [
          { presentacionId: '11', cantidad: '4' },
          { presentacionId: '', cantidad: '3' },
          { presentacionId: '10', cantidad: 'x' },
        ],
      });
      expect(totalEstimado(form, presentacionOpciones)).toBe(39.6);
    });
  });

  describe('validarPedido (RF-A032)', () => {
    it('accepts a complete order', () => {
      expect(validarPedido(makeFormValido())).toEqual([]);
    });

    it('requires a client and at least one product', () => {
      expect(
        validarPedido(
          makeFormValido({ clienteId: '', items: [{ presentacionId: '', cantidad: '1' }] }),
        ),
      ).toEqual(['cliente', 'al menos un producto']);
    });

    it('requires integer quantities greater than 0', () => {
      expect(
        validarPedido(makeFormValido({ items: [{ presentacionId: '10', cantidad: '0' }] })),
      ).toEqual(['cantidad entera mayor a 0']);
      expect(
        validarPedido(makeFormValido({ items: [{ presentacionId: '10', cantidad: '1.5' }] })),
      ).toEqual(['cantidad entera mayor a 0']);
    });

    it('does not allow repeating a product', () => {
      expect(
        validarPedido(
          makeFormValido({
            items: [
              { presentacionId: '10', cantidad: '1' },
              { presentacionId: '10', cantidad: '2' },
            ],
          }),
        ),
      ).toEqual(['productos sin repetir (ajusta la cantidad)']);
    });

    it('requires an address only for delivery', () => {
      expect(validarPedido(makeFormValido({ direccion: '  ' }))).toEqual(['dirección de entrega']);
      expect(
        validarPedido(makeFormValido({ tipoEntrega: 'recojo_tienda', direccion: '' })),
      ).toEqual([]);
    });
  });

  describe('labels', () => {
    it('shows the RN6 statuses with their tone', () => {
      expect(estadoLabel('en_espera_inventario')).toBe('En espera de inventario');
      expect(estadoTone('entregado')).toBe('success');
      expect(estadoTone('cancelado')).toBe('danger');
    });

    it('shows a dash when the order has no payment', () => {
      expect(metodoPagoLabel('culqi')).toBe('Culqi');
      expect(metodoPagoLabel(null)).toBe('—');
    });
  });
});
