import { SolicitudProduccionForm } from '../../interfaces/solicitud-produccion.interface';

export interface FilaDetalleSolicitudProduccionErrores {
  productoTerminadoId?: string;
  cantidadSolicitada?: string;
}

export interface SolicitudProduccionFormErrores {
  fechaLimite?: string;
  filas?: string;
  porFila?: Record<number, FilaDetalleSolicitudProduccionErrores>;
}

// Validacion de forma unicamente — regla de negocio real (stock
// suficiente, solapamiento de solicitudes, etc.) la aplica el backend.
export function validarSolicitudProduccionForm(
  form: SolicitudProduccionForm,
): SolicitudProduccionFormErrores {
  const errores: SolicitudProduccionFormErrores = {};

  if (!form.fechaLimite) {
    errores.fechaLimite = 'Requerido.';
  }

  if (form.filas.length === 0) {
    errores.filas = 'Agrega al menos un producto.';
    return errores;
  }

  const porFila: Record<number, FilaDetalleSolicitudProduccionErrores> = {};
  for (const fila of form.filas) {
    const filaErrores: FilaDetalleSolicitudProduccionErrores = {};
    if (!fila.productoTerminadoId) {
      filaErrores.productoTerminadoId = 'Selecciona un producto.';
    }
    const cantidad = Number(fila.cantidadSolicitada);
    if (fila.cantidadSolicitada === '' || Number.isNaN(cantidad) || cantidad <= 0) {
      filaErrores.cantidadSolicitada = 'Debe ser mayor a 0.';
    }
    if (Object.keys(filaErrores).length > 0) {
      porFila[fila.id] = filaErrores;
    }
  }
  if (Object.keys(porFila).length > 0) {
    errores.porFila = porFila;
  }

  const claves = form.filas.map((fila) => fila.productoTerminadoId);
  const hayDuplicados = claves
    .filter(Boolean)
    .some((clave, indice, vistos) => vistos.indexOf(clave) !== indice);
  if (hayDuplicados) {
    errores.filas = 'No puedes repetir el mismo producto en dos filas.';
  }

  return errores;
}
