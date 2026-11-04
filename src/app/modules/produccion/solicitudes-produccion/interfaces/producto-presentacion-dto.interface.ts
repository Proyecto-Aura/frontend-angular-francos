// Version recortada del contrato de GET /producto-presentaciones (confirmado
// por el backend) — solo los campos que necesita el selector de "Agregar
// lote" (ver lote-form-modal.ts). No se reusa la version completa de
// Inventario a proposito: cada modulo de dominio es autocontenido en este
// repo (sin imports cruzados entre modules/).
export interface PageDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface ProductoPresentacionDto {
  id: number;
  sku: string;
  estado: boolean;
  producto: { id: number; nombre: string };
  presentacion: { id: number; cantidad: number; unidad_medida: 'kg' | 'gr' };
  // Id propio de producto_terminado (no es el "id" de nivel superior) — es
  // el que hay que mandar como producto_terminado_id al crear un lote
  // (confirmado por el backend, OFT0-263). Puede venir null en el caso
  // rarisimo de que no se haya creado. stock_actual se agrego para el modal
  // "Registrar entrega" (OFT0-262) — mismo shape que ya usa Inventario en
  // este mismo endpoint, aca solo se toma el campo que hace falta.
  producto_terminado: { id: number; stock_actual: number } | null;
}
