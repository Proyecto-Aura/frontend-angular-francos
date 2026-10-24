// Catálogo de ubicación del backend (ubigeo INEI): el id es el código oficial
// (departamento 2 dígitos, provincia 4, distrito 6).
export interface UbigeoItem {
  id: string;
  nombre: string;
}

/** Ubicación de un cliente: departamento > provincia > distrito. */
export interface UbicacionCliente {
  departamento: UbigeoItem;
  provincia: UbigeoItem;
  distrito: UbigeoItem;
}

/** "San Isidro, Lima, Lima": del más específico al más general. */
export function textoUbicacion(ubicacion: UbicacionCliente | null): string {
  if (!ubicacion) {
    return '';
  }
  return [
    ubicacion.distrito.nombre,
    ubicacion.provincia.nombre,
    ubicacion.departamento.nombre,
  ].join(', ');
}
