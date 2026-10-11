import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorDto } from '../interfaces/producto-dto.interface';

/** El backend devuelve `message` como texto o como lista de textos (validaciones). */
export function mensajesDeError(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse)) return [];

  const apiError = error.error as Partial<ApiErrorDto> | null;
  if (Array.isArray(apiError?.message)) return apiError.message;
  return apiError?.message ? [apiError.message] : [];
}

/** Mensaje listo para mostrar al usuario ante un error de la API. */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
    return 'No tiene permisos para gestionar el catálogo de productos.';
  }

  return mensajesDeError(error).join(' ') || porDefecto;
}
