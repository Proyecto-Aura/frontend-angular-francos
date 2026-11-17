// Solo los campos que la pantalla de parámetros de ventas necesita (el módulo de configuración
// no importa DTOs de otros módulos).

/** Página que devuelven los listados del backend. */
export interface PaginaVentasDto<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

/** GET y PATCH `/parametros-ventas`. */
export interface ParametrosVentasDto {
  umbral_mayorista_global: number;
  umbral_por_producto: boolean;
  promociones_activas: boolean;
  culqi_activo: boolean;
  efectivo_activo: boolean;
  updated_at: string;
}

/** El PATCH acepta cualquier subconjunto: solo viaja lo que cambió. */
export type ActualizarParametrosVentasRequestDto = Partial<Omit<ParametrosVentasDto, 'updated_at'>>;

/** Fila de `GET /producto-presentaciones?con_mayorista=true`. */
export interface PresentacionMayoristaDto {
  id: number;
  sku: string;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
  producto: { nombre: string };
  presentacion: { cantidad: number; unidad_medida: string };
}

/** `PATCH /producto-presentaciones/:id`: `null` quita el umbral propio (rige el global). */
export interface ActualizarUmbralPresentacionRequestDto {
  umbral_mayorista: number | null;
}

/** Fila de `GET /promociones`. */
export interface PromocionDto {
  id: number;
  nombre: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: boolean;
  vigente: boolean;
}
