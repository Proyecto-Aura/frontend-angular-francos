import { capitalize } from './capitalize';

describe('capitalize', () => {
  it('uppercases the first letter', () => {
    expect(capitalize('admin')).toBe('Admin');
  });

  it('leaves the rest of the string untouched', () => {
    expect(capitalize('ventasYmas')).toBe('VentasYmas');
  });

  it('returns an empty string as-is', () => {
    expect(capitalize('')).toBe('');
  });
});
