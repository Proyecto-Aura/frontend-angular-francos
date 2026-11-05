import {
  SolicitudProduccionOpcionDto,
  SolicitudesProduccionOpcionPageDto,
} from '../interfaces/solicitud-produccion-opcion-dto.interface';
import { SolicitudProduccionOpcion } from '../interfaces/solicitud-produccion-opcion.interface';

export function toSolicitudProduccionOpcion(
  dto: SolicitudProduccionOpcionDto,
): SolicitudProduccionOpcion {
  return {
    id: dto.id,
    codigo: dto.codigo,
    estado: dto.estado,
  };
}

export function toSolicitudesProduccionOpcionLista(
  pageDto: SolicitudesProduccionOpcionPageDto,
): SolicitudProduccionOpcion[] {
  return pageDto.data.map(toSolicitudProduccionOpcion);
}
