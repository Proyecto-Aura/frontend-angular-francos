// Modelo limpio que usa el frontend — sin nada sensible ni formatos crudos de la BD.

export interface Usuario {
  id: number;
  email: string;
  username: string;
  activo: boolean;
}
