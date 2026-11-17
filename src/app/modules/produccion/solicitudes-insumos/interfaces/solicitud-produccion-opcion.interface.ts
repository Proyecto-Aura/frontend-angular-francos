export interface SolicitudProduccionOpcion {
  id: number;
  codigo: string;
  estado: 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';
}
