import {
  toActualizarParametrosRequest,
  toParametrosVentas,
  toPresentacionMayorista,
  toPromocion,
} from './parametros-ventas.mapper';

describe('parametros-ventas.mapper', () => {
  it('toParametrosVentas pasa los nombres del backend a los de la pantalla', () => {
    expect(
      toParametrosVentas({
        umbral_mayorista_global: 24,
        umbral_por_producto: false,
        promociones_activas: true,
        culqi_activo: true,
        efectivo_activo: false,
        updated_at: '2026-11-14T10:00:00Z',
      }),
    ).toEqual({
      umbralGlobal: 24,
      umbralPorProducto: false,
      promocionesActivas: true,
      culqiActivo: true,
      efectivoActivo: false,
    });
  });

  it('toActualizarParametrosRequest manda solo los campos presentes, también los falsos', () => {
    expect(toActualizarParametrosRequest({})).toEqual({});
    expect(
      toActualizarParametrosRequest({
        umbralGlobal: 36,
        promocionesActivas: false,
        efectivoActivo: false,
      }),
    ).toEqual({
      umbral_mayorista_global: 36,
      promociones_activas: false,
      efectivo_activo: false,
    });
  });

  it('toPresentacionMayorista arma el nombre de la presentación y conserva el umbral propio', () => {
    expect(
      toPresentacionMayorista({
        id: 7,
        sku: 'FR-CHI-250',
        precio_mayorista: 4.2,
        umbral_mayorista: 12,
        producto: { nombre: 'Chifles salados' },
        presentacion: { cantidad: 250, unidad_medida: 'gr' },
      }),
    ).toEqual({
      id: 7,
      sku: 'FR-CHI-250',
      producto: 'Chifles salados',
      presentacion: '250 gr',
      umbralPropio: 12,
    });
  });

  it('toPromocion traduce el tipo y formatea la vigencia sin correr el día', () => {
    expect(
      toPromocion({
        id: 1,
        nombre: '-15% en mix',
        tipo: 'porcentaje',
        fecha_inicio: '2026-10-15',
        fecha_fin: '2026-12-15',
        estado: true,
        vigente: true,
      }),
    ).toEqual({
      id: 1,
      nombre: '-15% en mix',
      tipo: 'Descuento',
      vigencia: '15 Oct 2026 – 15 Dic 2026',
      activa: true,
      vigente: true,
    });
  });

  it('toPromocion deja el tipo tal cual si no lo conoce', () => {
    expect(
      toPromocion({
        id: 2,
        nombre: 'Otra',
        tipo: 'nuevo_tipo',
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-01-31',
        estado: false,
        vigente: false,
      }).tipo,
    ).toBe('nuevo_tipo');
  });
});
