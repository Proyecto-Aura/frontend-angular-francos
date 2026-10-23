import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeError, mensajesDeError } from './error-api';

const error = (status: number, body: unknown) =>
  new HttpErrorResponse({ status, statusText: 'x', error: body });

describe('error-api', () => {
  it('reads a single message', () => {
    expect(mensajesDeError(error(409, { statusCode: 409, message: 'Ya existe' }))).toEqual([
      'Ya existe',
    ]);
  });

  it('reads a list of validation messages', () => {
    expect(mensajesDeError(error(400, { message: ['a', 'b'] }))).toEqual(['a', 'b']);
  });

  it('returns nothing for errors that are not HTTP errors or have no message', () => {
    expect(mensajesDeError(new Error('x'))).toEqual([]);
    expect(mensajesDeError(error(500, null))).toEqual([]);
  });

  it('joins the API messages for the user', () => {
    expect(mensajeDeError(error(400, { message: ['a', 'b'] }), 'por defecto')).toBe('a b');
  });

  it('falls back to the default message when the API gives none', () => {
    expect(mensajeDeError(error(500, null), 'por defecto')).toBe('por defecto');
    expect(mensajeDeError(new Error('x'), 'por defecto')).toBe('por defecto');
  });

  it('explains missing permissions on 401 and 403', () => {
    const permisos = 'No tiene permisos para gestionar el catálogo de productos.';

    expect(mensajeDeError(error(403, { message: 'Forbidden' }), 'x')).toBe(permisos);
    expect(mensajeDeError(error(401, { message: 'Unauthorized' }), 'x')).toBe(permisos);
  });
});
