import {
  ParametrosVentas,
  cambiosDeParametros,
  esCambioDeUmbral,
  umbralDeTexto,
  validarParametros,
  validarUmbralGlobal,
  validarUmbralPropio,
} from './parametros-ventas.interface';

const PARAMETROS: ParametrosVentas = {
  umbralGlobal: 24,
  umbralPorProducto: true,
  promocionesActivas: true,
  culqiActivo: true,
  efectivoActivo: true,
};

describe('validarUmbralGlobal (RF-A193)', () => {
  it('exige el umbral', () => {
    expect(validarUmbralGlobal('')).toBe('Ingresa el umbral');
    expect(validarUmbralGlobal('   ')).toBe('Ingresa el umbral');
  });

  it('acepta enteros de 2 a 10,000', () => {
    expect(validarUmbralGlobal('2')).toBeNull();
    expect(validarUmbralGlobal('24')).toBeNull();
    expect(validarUmbralGlobal('10000')).toBeNull();
  });

  it('rechaza lo que está fuera de rango o no es un entero', () => {
    const mensaje = 'Entre 2 y 10,000 unidades';
    expect(validarUmbralGlobal('1')).toBe(mensaje);
    expect(validarUmbralGlobal('10001')).toBe(mensaje);
    expect(validarUmbralGlobal('2.5')).toBe(mensaje);
    expect(validarUmbralGlobal('doce')).toBe(mensaje);
    expect(validarUmbralGlobal('-5')).toBe(mensaje);
  });
});

describe('validarUmbralPropio', () => {
  it('vacío es válido: la presentación usa el umbral global', () => {
    expect(validarUmbralPropio('')).toBeNull();
    expect(validarUmbralPropio('  ')).toBeNull();
  });

  it('con valor, aplica el mismo rango que el global', () => {
    expect(validarUmbralPropio('12')).toBeNull();
    expect(validarUmbralPropio('1')).toBe('Entre 2 y 10,000 unidades');
    expect(validarUmbralPropio('abc')).toBe('Entre 2 y 10,000 unidades');
  });
});

describe('umbralDeTexto y esCambioDeUmbral', () => {
  it('vacío es null y con valor es el número', () => {
    expect(umbralDeTexto('')).toBeNull();
    expect(umbralDeTexto(' 12 ')).toBe(12);
  });

  it('solo es cambio si el valor difiere del guardado', () => {
    expect(esCambioDeUmbral({ id: 1, original: 12, valor: '12' })).toBe(false);
    expect(esCambioDeUmbral({ id: 1, original: null, valor: '' })).toBe(false);
    expect(esCambioDeUmbral({ id: 1, original: 12, valor: '18' })).toBe(true);
    expect(esCambioDeUmbral({ id: 1, original: 12, valor: '' })).toBe(true);
    expect(esCambioDeUmbral({ id: 1, original: null, valor: '6' })).toBe(true);
  });
});

describe('validarParametros (RF-A195)', () => {
  it('sin errores si el umbral es válido y hay un método de pago', () => {
    expect(validarParametros(PARAMETROS, '24')).toEqual({});
    expect(validarParametros({ ...PARAMETROS, culqiActivo: false }, '24')).toEqual({});
  });

  it('marca el umbral inválido', () => {
    expect(validarParametros(PARAMETROS, '')).toEqual({ umbral: 'Ingresa el umbral' });
  });

  it('no deja el portal sin ningún método de pago', () => {
    const sinPagos = { ...PARAMETROS, culqiActivo: false, efectivoActivo: false };
    expect(validarParametros(sinPagos, '24')).toEqual({
      pagos: 'Debe quedar al menos un método de pago activo',
    });
  });
});

describe('cambiosDeParametros', () => {
  it('devuelve solo los campos que cambiaron', () => {
    const editado = { ...PARAMETROS, umbralGlobal: 36, promocionesActivas: false };
    expect(cambiosDeParametros(PARAMETROS, editado)).toEqual({
      umbralGlobal: 36,
      promocionesActivas: false,
    });
  });

  it('devuelve vacío si no cambió nada', () => {
    expect(cambiosDeParametros(PARAMETROS, { ...PARAMETROS })).toEqual({});
  });
});
