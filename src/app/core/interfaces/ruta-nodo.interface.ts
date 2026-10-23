// Forma real de GET /api/v1/rutas/mi-menu y /rutas/tree (confirmado por el backend).
// "nombre" es una key unica GLOBAL (constraint uq_ruta_nombre, no por padre) —
// nunca asumir que se arma concatenando nombres de ancestros.
export interface RutaNodo {
  id: number;
  nombre: string;
  etiqueta: string;
  icono: string;
  // Solo viene completo en los nodos raiz (los modulos) — null en todo lo demas,
  // pensado para el subtitulo de las tarjetas del home, no para el sidebar.
  descripcion: string | null;
  estado: boolean;
  parent_id: number | null;
  children: RutaNodo[];
}
