import { esLlaveDePruebas } from './culqi-checkout.service';

describe('esLlaveDePruebas', () => {
  it('accepts only Culqi test public keys', () => {
    expect(esLlaveDePruebas('pk_test_abc123')).toBe(true);
  });

  it('rejects production keys and empty values', () => {
    expect(esLlaveDePruebas('pk_live_abc123')).toBe(false);
    expect(esLlaveDePruebas('sk_test_abc123')).toBe(false);
    expect(esLlaveDePruebas('')).toBe(false);
  });
});
