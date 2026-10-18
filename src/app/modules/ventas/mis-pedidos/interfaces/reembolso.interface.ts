import { BadgeTone } from '../../../../shared/ds/badge/badge';
import { MetodoPagoDto } from './pedido-dto.interface';
import { EstadoReembolsoDto } from './reembolso-dto.interface';

// ───────────── Etiquetas (RN de reembolso) ─────────────

export const ESTADOS_REEMBOLSO: { value: EstadoReembolsoDto; label: string; tone: BadgeTone }[] = [
  { value: 'pendiente', label: 'Pendiente', tone: 'warning' },
  { value: 'aprobado', label: 'Aprobado', tone: 'info' },
  { value: 'rechazado', label: 'Rechazado', tone: 'danger' },
  { value: 'reembolsado', label: 'Reembolsado', tone: 'success' },
];

export const estadoReembolsoLabel = (e: EstadoReembolsoDto) =>
  ESTADOS_REEMBOLSO.find((x) => x.value === e)?.label ?? '—';
export const estadoReembolsoTone = (e: EstadoReembolsoDto): BadgeTone =>
  ESTADOS_REEMBOLSO.find((x) => x.value === e)?.tone ?? 'neutral';

/** Fecha como en el prototipo: "17 oct 2026". */
export const fechaDia = (d: Date): string =>
  d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

// ───────────── Modelos de pantalla ─────────────

/** Fila del listado de solicitudes (RF-A039). */
export interface ReembolsoFila {
  id: number;
  codigo: string;
  pedido: string;
  cliente: string;
  metodo: MetodoPagoDto;
  metodoLabel: string;
  monto: number;
  estado: EstadoReembolsoDto;
  fecha: Date;
}

/** Detalle de una solicitud (RF-A041). */
export interface ReembolsoDetalle extends ReembolsoFila {
  motivo: string;
  evidencia: { nombre: string; url: string } | null;
  motivoRechazo: string | null;
}

/** RF-A040: filtros del listado. `fecha` es un día YYYY-MM-DD. */
export interface FiltrosReembolsos {
  q: string;
  estado: EstadoReembolsoDto | '';
  fecha: string;
}

export const FILTROS_REEMBOLSO_VACIOS: FiltrosReembolsos = { q: '', estado: '', fecha: '' };

// ───────────── Trazabilidad ─────────────

export type TipoPaso = 'aprobada' | 'rechazada' | 'motivo' | 'en_culqi' | 'confirmada';

export interface PasoTraza {
  tipo: TipoPaso;
  label: string;
  detalle: string;
}

/** Lo que ya pasó con la solicitud, como en el prototipo. */
export function trazaDe(d: ReembolsoDetalle): PasoTraza[] {
  const pasos: PasoTraza[] = [];
  if (d.estado === 'pendiente') return pasos;

  if (d.estado === 'rechazado') {
    pasos.push({
      tipo: 'rechazada',
      label: 'Solicitud rechazada',
      detalle: 'Cliente notificado automáticamente',
    });
    if (d.motivoRechazo) {
      pasos.push({ tipo: 'motivo', label: 'Motivo del rechazo', detalle: d.motivoRechazo });
    }
    return pasos;
  }

  pasos.push({
    tipo: 'aprobada',
    label: 'Solicitud aprobada',
    detalle: 'Cliente notificado automáticamente',
  });
  if (d.estado === 'aprobado' && d.metodo === 'culqi') {
    pasos.push({
      tipo: 'en_culqi',
      label: 'Devolución enviada a Culqi',
      detalle: 'En espera de la confirmación de la pasarela',
    });
  }
  if (d.estado === 'reembolsado') {
    pasos.push({
      tipo: 'confirmada',
      label: 'Devolución confirmada por Culqi',
      detalle: 'Solicitud en estado reembolsado · cliente notificado',
    });
  }
  return pasos;
}
