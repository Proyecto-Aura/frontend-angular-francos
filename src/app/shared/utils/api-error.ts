import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae un mensaje legible de una respuesta de error del backend.
 * Los errores de dominio llegan como `{ message: string }` (ya en español);
 * los de validación del ValidationPipe llegan como `{ message: string[] }`
 * en inglés, así que no se muestran: se usa el texto de respaldo.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Inténtalo nuevamente en unos minutos.';
    }
    const msg = (err.error as { message?: unknown } | null)?.message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}
