import { FILTROS_VACIOS } from '../interfaces/pedido.interface';
import {
  CLIENTE_ID,
  clientesDto,
  makeDetalleDto,
  makeFormValido,
  makeResumenDto,
  personasDto,
  presentacionesDto,
} from '../testing/pedidos.fixtures';
import {
  toClienteOpciones,
  toCrearPedidoRequest,
  toListarParams,
  toPedidoDetalle,
  toPedidoFila,
  toPresentacionOpciones,
} from './pedido.mapper';

describe('pedido.mapper', () => {
  it('maps a list row with its labels', () => {
    expect(toPedidoFila(makeResumenDto({ metodo_pago: 'culqi', origen: 'portal' }))).toEqual({
      id: 1,
      codigo: 'PED-000001',
      origen: 'Portal B',
      cliente: 'Rosa Elena Quispe Huamán',
      metodoPago: 'Culqi',
      total: 165.6,
      tipoEntrega: 'Delivery',
      estado: 'confirmado',
      creado: new Date('2026-10-17T15:00:00.000Z'),
    });
  });

  it('maps the detail with products and payment', () => {
    const detalle = toPedidoDetalle(makeDetalleDto());

    expect(detalle.items[0]).toEqual({
      sku: 'FR-P1-PR1',
      nombre: 'Chifles clásicos 100 gr',
      cantidad: 30,
      precioUnit: 5.5,
      precioAplicado: 4.2,
      subtotal: 126,
    });
    expect(detalle.pago).toEqual({
      metodo: 'Efectivo',
      monto: 165.6,
      operacion: null,
      fecha: new Date('2026-10-17T15:00:00.000Z'),
      comprobante: null,
    });
  });

  it('sends only the filters with a value', () => {
    expect(toListarParams(FILTROS_VACIOS, 1, 10)).toEqual({ page: 1, limit: 10 });
    expect(
      toListarParams(
        { estado: 'confirmado', origen: 'manual', desde: '2026-10-01', hasta: '2026-10-31' },
        2,
        10,
      ),
    ).toEqual({
      page: 2,
      limit: 10,
      estado: 'confirmado',
      origen: 'manual',
      fecha_desde: '2026-10-01',
      fecha_hasta: '2026-10-31',
    });
  });

  it('builds active clients with name, document and address', () => {
    expect(toClienteOpciones(clientesDto, personasDto)).toEqual([
      {
        id: 'cli-empresa',
        nombre: 'Distribuidora Andes S.A.C.',
        documento: '20548712345',
        direccion: '',
      },
      {
        id: CLIENTE_ID,
        nombre: 'Rosa Elena Quispe Huamán',
        documento: '45288977',
        direccion: 'Jr. Las Magnolias 312, Surco',
      },
    ]);
  });

  it('leaves out clients without a person', () => {
    expect(toClienteOpciones(clientesDto, [])).toEqual([]);
  });

  it('offers only active presentations of active products', () => {
    expect(toPresentacionOpciones(presentacionesDto).map((p) => p.id)).toEqual([10, 11]);
    expect(
      toPresentacionOpciones([
        { ...presentacionesDto[0], producto: { ...presentacionesDto[0].producto, estado: false } },
      ]),
    ).toEqual([]);
  });

  describe('toCrearPedidoRequest', () => {
    it('sends the address only for delivery', () => {
      expect(toCrearPedidoRequest(makeFormValido({ direccion: '  Av. Grau 1045 ' }), null)).toEqual(
        {
          cliente_id: CLIENTE_ID,
          items: [
            { producto_presentacion_id: 10, cantidad: 30 },
            { producto_presentacion_id: 11, cantidad: 4 },
          ],
          tipo_entrega: 'delivery',
          direccion_entrega: 'Av. Grau 1045',
          metodo_pago: 'efectivo',
        },
      );
      expect(
        toCrearPedidoRequest(makeFormValido({ tipoEntrega: 'recojo_tienda' }), null),
      ).not.toHaveProperty('direccion_entrega');
    });

    it('includes the token when paying with Culqi', () => {
      expect(
        toCrearPedidoRequest(makeFormValido({ metodoPago: 'culqi' }), 'tkn_test_1'),
      ).toMatchObject({ metodo_pago: 'culqi', culqi_token: 'tkn_test_1' });
    });
  });
});
