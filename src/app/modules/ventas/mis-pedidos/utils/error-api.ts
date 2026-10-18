import { HttpErrorResponse } from '@angular/common/http';
import { mensajesDeError } from '../../catalogo/utils/error-api';

/** Mensaje listo para mostrar al usuario ante un error de la API de pedidos. */
export function mensajeDeErrorPedido(error: unknown, porDefecto: string): string {
  if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
    return 'No tiene permisos para gestionar los pedidos.';
  }

  // 402: Culqi rechazó el pago; el mensaje es el que Culqi da para el cliente.
  // 503: Culqi no está configurado o no respondió. En ambos casos el pedido no se registró.
  return mensajesDeError(error).join(' ') || porDefecto;
}
