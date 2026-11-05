// Version recortada del contrato de GET /produccion/solicitudes (el mismo
// endpoint que ya consume el modulo solicitudes-produccion de este mismo
// modulo Produccion) — solo lo que necesita el buscador de "Solicitud de
// producción" en el form de "Nueva solicitud de insumos", para vincular
// opcionalmente (solicitud_produccion_id). No se reusa el servicio/
// interfaces de solicitudes-produccion a proposito: cada carpeta de
// dominio dentro de este repo es autocontenida (sin imports cruzados entre
// carpetas de dominio).
export interface SolicitudProduccionOpcionDto {
  id: number;
  codigo: string;
  estado: 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';
}

export interface SolicitudesProduccionOpcionPageDto {
  data: SolicitudProduccionOpcionDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
