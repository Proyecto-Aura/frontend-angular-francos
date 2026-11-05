import { SolicitudInsumoForm } from '../../interfaces/solicitud-insumo.interface';

export interface FilaDetalleSolicitudInsumoErrores {
  insumoId?: string;
  cantidadSolicitada?: string;
}

export interface SolicitudInsumoFormErrores {
  fechaLimite?: string;
  filas?: string;
  porFila?: Record<number, FilaDetalleSolicitudInsumoErrores>;
}

// Validacion de forma unicamente — regla de negocio real (stock suficiente,
// etc.) la aplica el backend al momento de "entregar".
export function validarSolicitudInsumoForm(form: SolicitudInsumoForm): SolicitudInsumoFormErrores {
  const errores: SolicitudInsumoFormErrores = {};

  if (!form.fechaLimite) {
    errores.fechaLimite = 'Requerido.';
  }

  if (form.filas.length === 0) {
    errores.filas = 'Agrega al menos un insumo.';
    return errores;
  }

  const porFila: Record<number, FilaDetalleSolicitudInsumoErrores> = {};
  for (const fila of form.filas) {
    const filaErrores: FilaDetalleSolicitudInsumoErrores = {};
    if (!fila.insumoId) {
      filaErrores.insumoId = 'Selecciona un insumo.';
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

  const claves = form.filas.map((fila) => fila.insumoId);
  const hayDuplicados = claves
    .filter(Boolean)
    .some((clave, indice, vistos) => vistos.indexOf(clave) !== indice);
  if (hayDuplicados) {
    errores.filas = 'No puedes repetir el mismo insumo en dos filas.';
  }

  return errores;
}
