import {
  makeCanalEmailDto,
  makeCanalPortalDto,
  makePlantillaDto,
} from '../testing/notificacion.fixtures';
import { toCanalEmail, toCanalPortal, toPlantillaCorreo } from './notificacion.mapper';

describe('notificacion.mapper', () => {
  it('toCanalEmail mapea los campos y usa cadena vacía si vienen null', () => {
    expect(toCanalEmail(makeCanalEmailDto())).toEqual({
      activo: true,
      remitente: 'no-reply@francos.pe',
      servidorSmtp: 'smtp.francos.pe:587',
      seguridad: 'STARTTLS',
    });
    expect(toCanalEmail(makeCanalEmailDto({ remitente: null })).remitente).toBe('');
  });

  it('toCanalPortal mapea los campos', () => {
    expect(toCanalPortal(makeCanalPortalDto())).toEqual({
      activo: true,
      destinatarios: 'Clientes del Portal B',
    });
  });

  it('toPlantillaCorreo formatea la fecha y nunca truena con una fecha inválida', () => {
    const plantilla = toPlantillaCorreo(makePlantillaDto());
    expect(plantilla.actualizada).toContain('2026');
    expect(plantilla.variables).toEqual(['nombre', 'enlace']);

    expect(() => toPlantillaCorreo(makePlantillaDto({ updated_at: '' }))).not.toThrow();
    expect(toPlantillaCorreo(makePlantillaDto({ updated_at: '' })).actualizada).toBe('—');
  });
});
