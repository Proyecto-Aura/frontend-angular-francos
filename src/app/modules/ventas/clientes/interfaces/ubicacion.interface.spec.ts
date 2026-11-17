import { textoUbicacion } from './ubicacion.interface';

describe('ubicacion.interface', () => {
  describe('textoUbicacion', () => {
    it('joins district, province and department from the most specific', () => {
      expect(
        textoUbicacion({
          departamento: { id: '15', nombre: 'Lima' },
          provincia: { id: '1501', nombre: 'Lima' },
          distrito: { id: '150131', nombre: 'San Isidro' },
        }),
      ).toBe('San Isidro, Lima, Lima');
    });

    it('is empty when the client has no location', () => {
      expect(textoUbicacion(null)).toBe('');
    });
  });
});
