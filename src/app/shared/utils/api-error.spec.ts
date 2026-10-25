import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

const FALLBACK = 'Algo salió mal';

function httpError(status: number, body: unknown) {
  return new HttpErrorResponse({ status, error: body });
}

describe('apiErrorMessage', () => {
  it('returns the backend message when it is a string', () => {
    const err = httpError(400, { message: 'El enlace de recuperación es inválido o ha expirado' });
    expect(apiErrorMessage(err, FALLBACK)).toBe(
      'El enlace de recuperación es inválido o ha expirado',
    );
  });

  it('uses the fallback when the message is an array (validation errors in English)', () => {
    const err = httpError(400, { message: ['nueva_contrasena must be longer than or equal to 8'] });
    expect(apiErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it('reports a connection problem when there is no response (status 0)', () => {
    expect(apiErrorMessage(httpError(0, null), FALLBACK)).toContain('No se pudo conectar');
  });

  it('uses the fallback for anything that is not an HttpErrorResponse', () => {
    expect(apiErrorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
  });
});
