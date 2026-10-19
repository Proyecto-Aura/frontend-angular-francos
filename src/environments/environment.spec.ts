import { environment } from './environment';
import { environment as environmentProd } from './environment.prod';

// El backend monta todo bajo el prefijo global `api/v1`: sin él, cada llamada
// responde 404 ("Cannot POST /api/auth/...").
describe('environment', () => {
  it.each([
    ['development', environment.apiUrl],
    ['production', environmentProd.apiUrl],
  ])('%s points to the /api/v1 prefix of the backend', (_, apiUrl) => {
    expect(apiUrl.endsWith('/api/v1')).toBe(true);
  });

  // Angular incrusta apiUrl en el bundle: con localhost, el navegador de cada
  // usuario llamaría a su propia máquina. En producción debe ser relativa.
  it('production uses a relative apiUrl, never localhost', () => {
    expect(environmentProd.apiUrl.startsWith('/')).toBe(true);
    expect(environmentProd.apiUrl).not.toContain('localhost');
  });
});
