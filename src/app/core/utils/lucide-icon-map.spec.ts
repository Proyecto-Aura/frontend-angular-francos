import { resolveLucideIcon } from './lucide-icon-map';
import { LucideBoxes, LucideBuilding2, LucideHandshake, LucideStore } from '@lucide/angular';

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

  it('returns undefined for an unknown name instead of throwing', () => {
    expect(resolveLucideIcon('not-a-real-icon')).toBeUndefined();
  });
});
