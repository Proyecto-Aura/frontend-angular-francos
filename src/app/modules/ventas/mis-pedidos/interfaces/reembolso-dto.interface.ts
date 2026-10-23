// Formas exactas de la API de reembolsos (/reembolsos). Ver Swagger: /api/docs → Reembolsos.
import { MetodoPagoDto } from './pedido-dto.interface';

export type EstadoReembolsoDto = 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado';

/** Fila de GET /reembolsos (RF-A039). */
export interface ReembolsoResumenDto {
  id: number;
  codigo: string;
  pedido: { id: number; codigo: string };
  cliente: { nombre: string };
  metodo_pago: MetodoPagoDto;
  monto: number;
  estado: EstadoReembolsoDto;
  fecha_solicitud: string;
}

/** GET /reembolsos/:id y respuesta de aprobar, rechazar y confirmar (RF-A041). */
export interface ReembolsoDetalleDto extends ReembolsoResumenDto {
  motivo_cliente: string;
  /** `url` es un enlace firmado que vence a los 5 minutos. */
  evidencia: { nombre: string; url: string } | null;
  motivo_rechazo: string | null;
  fecha_resolucion: string | null;
}

/** PATCH /reembolsos/:id/rechazar (RF-A043). */
export interface RechazarReembolsoRequest {
  motivo_rechazo: string;
}
