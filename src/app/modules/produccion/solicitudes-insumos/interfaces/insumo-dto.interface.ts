// Version recortada del contrato de GET /insumos (el mismo endpoint que ya
// usa Inventario, ver insumos/interfaces/insumo-dto.interface.ts) — solo
// los campos que necesita el selector de "Nueva solicitud de insumos"/
// "Editar solicitud". No se reusa la version completa de Inventario a
// proposito: cada modulo de dominio es autocontenido en este repo (sin
// imports cruzados entre modules/).
export interface InsumoDto {
  id: number;
  sku: string;
  nombre: string;
  unidad_medida: 'kg' | 'litros' | 'unidad';
  stock_actual: number;
  stock_minimo: number;
}

export interface InsumosPageDto {
  data: InsumoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
