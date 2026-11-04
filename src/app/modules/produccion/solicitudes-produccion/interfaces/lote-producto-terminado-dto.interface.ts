// Espejo del contrato real de /api/v1/lotes-producto-terminado (confirmado
// por el backend, OFT0-263) — GET ya existia desde OFT0-259, el POST es
// nuevo: antes era solo lectura (los lotes nacian por seed), ahora
// Produccion los puede registrar a mano, mismo patron que lotes-insumo.
export type EstadoLoteProductoTerminadoDto = 'activo' | 'por_vencer' | 'agotado' | 'vencido';

export interface LoteProductoTerminadoDto {
  id: number;
  producto_terminado_id: number;
  // Embebidos via JOIN (confirmado por el backend) — no hace falta
  // resolverlos aparte contra /producto-presentaciones.
  sku: string;
  producto_nombre: string;
  presentacion_cantidad: number;
  presentacion_unidad_medida: 'kg' | 'gr';
  codigo_lote: string;
  fecha_produccion: string;
  fecha_vencimiento: string | null;
  cantidad_inicial: number;
  cantidad_actual: number;
  estado: EstadoLoteProductoTerminadoDto;
  activo: boolean;
}

export interface LotesProductoTerminadoPageDto {
  data: LoteProductoTerminadoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// POST /lotes-producto-terminado (confirmado por el backend, OFT0-263).
// Roles admin/produccion — inventario NO puede crear, solo listar/ver
// (igual que produccion con lotes-insumo). El lote nace en 0 y un
// movimiento "entrada" automatico (trigger de DB) lo deja en
// cantidad_inicial.
export interface CrearLoteProductoTerminadoRequestDto {
  // OJO: es producto_terminado_id, NO producto_presentacion_id (son dos PKs
  // distintas — ver nota en producto-presentacion-dto.interface.ts).
  producto_terminado_id: number;
  codigo_lote: string;
  fecha_produccion: string;
  fecha_vencimiento?: string;
  cantidad_inicial: number;
  activo?: boolean;
  razon?: string;
  // Liga el lote a una linea de una solicitud a produccion en_proceso
  // (OFT0-262, "Agregar lote" con buscador de solicitud) — campo ya
  // existente en el backend para trazabilidad, opcional: se omite en el
  // flujo manual "suelto" de registrar un lote sin solicitud.
  solicitud_produccion_id?: number;
}
