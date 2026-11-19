import { resolveLucideIcon } from './lucide-icon-map';
import {
  LucideBell,
  LucideBoxes,
  LucideBuilding2,
  LucideHandshake,
  LucideSlidersHorizontal,
  LucideStore,
  LucideTruck,
} from '@lucide/angular';

describe('resolveLucideIcon', () => {
  it('resolves a known kebab-case name to its Lucide component', () => {
    expect(resolveLucideIcon('boxes')).toBe(LucideBoxes);
  });

  it('resolves a multi-word kebab-case name (Ventas/Gestión Estratégica icons)', () => {
    expect(resolveLucideIcon('store')).toBe(LucideStore);
    expect(resolveLucideIcon('building-2')).toBe(LucideBuilding2);
  });

  it('resolves the receipt icon used by Series de comprobantes', () => {
    expect(resolveLucideIcon('receipt')).toBeDefined();
  });

  it('resolves the handshake icon used by the Producción module', () => {
    expect(resolveLucideIcon('handshake')).toBe(LucideHandshake);
  });

  it('resolves the truck icon used by the Despachos screen', () => {
    expect(resolveLucideIcon('truck')).toBe(LucideTruck);
  });

  it('resolves the sliders-horizontal icon used by Parámetros de ventas', () => {
    expect(resolveLucideIcon('sliders-horizontal')).toBe(LucideSlidersHorizontal);
  });

  it('resolves the bell icon used by Notificaciones', () => {
    expect(resolveLucideIcon('bell')).toBe(LucideBell);
  });

  it('returns undefined for an unknown name instead of throwing', () => {
    expect(resolveLucideIcon('not-a-real-icon')).toBeUndefined();
  });
});
