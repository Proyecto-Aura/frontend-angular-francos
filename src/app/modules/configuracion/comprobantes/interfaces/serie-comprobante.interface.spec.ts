import { toSerieComprobante } from '../mappers/serie-comprobante.mapper';
import { makeSerieDto } from '../testing/serie-fixtures';
import {
  FiltrosSeries,
  SERIE_FORM_VACIO,
  SerieForm,
  UMBRAL_ALERTA_POR_DEFECTO,
  coincideConFiltros,
  comprobanteSiguiente,
  conflictoDeCampo,
  estadoDe,
  etiquetaUso,
  filaDe,
  formatearCorrelativo,
  guardarUmbral,
  leerUmbralGuardado,
  serieFormDe,
  ultimoNumero,
  validarSerie,
} from './serie-comprobante.interface';

const FORM_VALIDO: SerieForm = {
  tipo: 'factura',
  serie: 'F001',
  inicio: '1',
  fin: '5000',
  activa: true,
};

/** Serie de 5000 números con `usados` ya emitidos. */
const serieCon = (usados: number, overrides = {}) =>
  toSerieComprobante(
    makeSerieDto({
      correlativo_fin: 5000,
      correlativo_actual: usados || null,
      siguiente: usados < 5000 ? usados + 1 : null,
      restantes: 5000 - usados,
      ...overrides,
    }),
  );

describe('serie-comprobante.interface', () => {
  describe('formatearCorrelativo / comprobanteSiguiente', () => {
    it('rellena con ceros hasta 8 dígitos', () => {
      expect(formatearCorrelativo(1848)).toBe('00001848');
    });

    it('arma el próximo comprobante con la serie', () => {
      expect(comprobanteSiguiente(toSerieComprobante(makeSerieDto()))).toBe('F001-00001848');
    });

    it('devuelve null si la serie se agotó', () => {
      const serie = toSerieComprobante(makeSerieDto({ siguiente: null, restantes: 0 }));
      expect(comprobanteSiguiente(serie)).toBeNull();
    });
  });

  describe('ultimoNumero', () => {
    it('es el último emitido', () => {
      expect(ultimoNumero(serieCon(120))).toBe(120);
    });

    it('si no emitió ninguno, es el anterior al inicial', () => {
      expect(ultimoNumero(serieCon(0))).toBe(0);
    });
  });

  describe('etiquetaUso', () => {
    it('muestra "<1%" cuando se usó algo pero menos del 1 %', () => {
      expect(etiquetaUso(toSerieComprobante(makeSerieDto()))).toBe('<1%');
    });

    it('muestra 0% si no se emitió nada', () => {
      expect(etiquetaUso(serieCon(0))).toBe('0%');
    });

    it('redondea hacia abajo el porcentaje usado', () => {
      expect(etiquetaUso(serieCon(4612))).toBe('92%');
    });

    it('muestra 100% cuando se agotó', () => {
      expect(etiquetaUso(serieCon(5000))).toBe('100%');
    });
  });

  describe('estadoDe', () => {
    it('una serie activa con poco uso está "activa"', () => {
      expect(estadoDe(serieCon(100), 90)).toBe('activa');
    });

    it('al llegar al porcentaje elegido está "por agotarse"', () => {
      expect(estadoDe(serieCon(4500), 90)).toBe('por-agotar');
    });

    it('el mismo uso no alerta con un porcentaje mayor', () => {
      expect(estadoDe(serieCon(4500), 95)).toBe('activa');
    });

    it('bajar el porcentaje hace que más series alerten', () => {
      expect(estadoDe(serieCon(3600), 70)).toBe('por-agotar');
      expect(estadoDe(serieCon(3600), 80)).toBe('activa');
    });

    it('sin correlativos restantes está "agotada"', () => {
      expect(estadoDe(serieCon(5000), 90)).toBe('agotada');
    });

    it('una serie desactivada está "inactiva" aunque tenga mucho uso', () => {
      expect(estadoDe(serieCon(4500, { estado: false }), 90)).toBe('inactiva');
    });

    it('una serie agotada sigue "agotada" aunque esté desactivada', () => {
      expect(estadoDe(serieCon(5000, { estado: false }), 90)).toBe('agotada');
    });
  });

  describe('coincideConFiltros', () => {
    const fila = (usados: number, overrides = {}) => filaDe(serieCon(usados, overrides), 90);
    const filtros = (cambios: Partial<FiltrosSeries>): FiltrosSeries => ({
      tipo: '',
      estado: '',
      ...cambios,
    });

    it('sin filtros muestra todas', () => {
      expect(coincideConFiltros(fila(100), filtros({}))).toBe(true);
    });

    it('filtra por tipo', () => {
      expect(coincideConFiltros(fila(100), filtros({ tipo: 'boleta' }))).toBe(false);
      expect(coincideConFiltros(fila(100), filtros({ tipo: 'factura' }))).toBe(true);
    });

    it('"Activa" incluye las que están por agotarse y excluye las agotadas', () => {
      expect(coincideConFiltros(fila(4500), filtros({ estado: 'activa' }))).toBe(true);
      expect(coincideConFiltros(fila(5000), filtros({ estado: 'activa' }))).toBe(false);
    });

    it('"Por agotarse" solo deja las que alertan', () => {
      expect(coincideConFiltros(fila(4500), filtros({ estado: 'alerta' }))).toBe(true);
      expect(coincideConFiltros(fila(100), filtros({ estado: 'alerta' }))).toBe(false);
    });

    it('"Inactiva" deja las desactivadas', () => {
      expect(
        coincideConFiltros(fila(100, { estado: false }), filtros({ estado: 'inactiva' })),
      ).toBe(true);
      expect(coincideConFiltros(fila(100), filtros({ estado: 'inactiva' }))).toBe(false);
    });

    it('"Agotada" deja las que no tienen correlativos', () => {
      expect(coincideConFiltros(fila(5000), filtros({ estado: 'agotada' }))).toBe(true);
      expect(coincideConFiltros(fila(100), filtros({ estado: 'agotada' }))).toBe(false);
    });
  });

  describe('umbral guardado', () => {
    afterEach(() => localStorage.clear());

    it('sin nada guardado usa el 90 %', () => {
      expect(leerUmbralGuardado()).toBe(UMBRAL_ALERTA_POR_DEFECTO);
    });

    it('recuerda el porcentaje elegido', () => {
      guardarUmbral(70);

      expect(leerUmbralGuardado()).toBe(70);
    });

    it('ignora un valor guardado que no es una opción válida', () => {
      localStorage.setItem('francos-series-umbral', '42');

      expect(leerUmbralGuardado()).toBe(UMBRAL_ALERTA_POR_DEFECTO);
    });
  });

  describe('validarSerie', () => {
    it('acepta un formulario correcto', () => {
      expect(validarSerie(FORM_VALIDO, null)).toEqual({});
    });

    it('el formulario vacío pide la serie y los dos correlativos', () => {
      const errores = validarSerie({ ...SERIE_FORM_VACIO }, null);

      expect(errores.serie).toBe('Formato: F + 3 caracteres');
      expect(errores.inicio).toBe('Mínimo 1');
      expect(errores.fin).toBe('Máximo 99999999');
    });

    it('la serie de una boleta debe empezar por B', () => {
      const errores = validarSerie({ ...FORM_VALIDO, tipo: 'boleta', serie: 'F001' }, null);

      expect(errores.serie).toBe('Formato: B + 3 caracteres');
    });

    it('la serie debe tener 4 caracteres', () => {
      expect(validarSerie({ ...FORM_VALIDO, serie: 'F01' }, null).serie).toBeDefined();
      expect(validarSerie({ ...FORM_VALIDO, serie: 'F0012' }, null).serie).toBeDefined();
      expect(validarSerie({ ...FORM_VALIDO, serie: 'f001' }, null).serie).toBeUndefined();
    });

    it('el correlativo inicial es como mínimo 1', () => {
      expect(validarSerie({ ...FORM_VALIDO, inicio: '0' }, null).inicio).toBe('Mínimo 1');
      expect(validarSerie({ ...FORM_VALIDO, inicio: '' }, null).inicio).toBe('Mínimo 1');
    });

    it('el correlativo final es como máximo 99999999', () => {
      expect(validarSerie({ ...FORM_VALIDO, fin: '100000000' }, null).fin).toBe('Máximo 99999999');
      expect(validarSerie({ ...FORM_VALIDO, fin: '' }, null).fin).toBe('Máximo 99999999');
      expect(validarSerie({ ...FORM_VALIDO, fin: '12a' }, null).fin).toBe('Máximo 99999999');
    });

    it('el final debe ser mayor al inicial', () => {
      const errores = validarSerie({ ...FORM_VALIDO, inicio: '500', fin: '500' }, null);

      expect(errores.fin).toBe('Debe ser mayor al inicial');
    });

    it('no deja bajar el final del último número emitido', () => {
      const emitida = serieCon(120);

      expect(validarSerie({ ...serieFormDe(emitida), fin: '100' }, emitida).fin).toBe(
        'No puede ser menor al último emitido (120)',
      );
    });

    it('si la serie ya emitió, el final solo se puede ampliar', () => {
      const emitida = serieCon(120);

      expect(validarSerie({ ...serieFormDe(emitida), fin: '4000' }, emitida).fin).toContain(
        'ampliar',
      );
      expect(validarSerie({ ...serieFormDe(emitida), fin: '6000' }, emitida).fin).toBeUndefined();
    });

    it('si la serie no emitió, el final se puede reducir', () => {
      const sinEmitir = serieCon(0);

      expect(validarSerie({ ...serieFormDe(sinEmitir), fin: '4000' }, sinEmitir)).toEqual({});
    });
  });

  describe('conflictoDeCampo', () => {
    it('marca la serie como ya existente', () => {
      expect(conflictoDeCampo('Ya existe una serie con ese código')).toEqual({
        campo: 'serie',
        texto: 'La serie ya existe',
      });
    });

    it('no reconoce otros conflictos', () => {
      expect(
        conflictoDeCampo('Ya existe una serie activa de tipo boleta; desactívala antes'),
      ).toBeNull();
    });
  });
});
