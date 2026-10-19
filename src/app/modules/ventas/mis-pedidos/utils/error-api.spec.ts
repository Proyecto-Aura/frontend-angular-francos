import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeErrorPedido } from './error-api';

const errorHttp = (status: number, message?: string | string[]) =>
  new HttpErrorResponse({ status, error: message ? { statusCode: status, message } : null });

describe('mensajeDeErrorPedido', () => {
  it('reports missing permissions on 401 and 403', () => {
    expect(mensajeDeErrorPedido(errorHttp(403, 'Forbidden'), 'x')).toBe(
      'No tiene permisos para gestionar los pedidos.',
    );
  });

  it('shows the Culqi message when the payment is declined (402)', () => {
    expect(
      mensajeDeErrorPedido(errorHttp(402, 'Tu tarjeta no tiene fondos suficientes.'), 'x'),
    ).toBe('Tu tarjeta no tiene fondos suficientes.');
  });

  it('joins the validation messages', () => {
    expect(mensajeDeErrorPedido(errorHttp(400, ['a', 'b']), 'x')).toBe('a b');
  });

  it('uses the default message when the API gives none', () => {
    expect(mensajeDeErrorPedido(errorHttp(500), 'Intente nuevamente')).toBe('Intente nuevamente');
    expect(mensajeDeErrorPedido(new Error('red'), 'Intente nuevamente')).toBe('Intente nuevamente');
  });
});
