import { EmpresaDto, GuardarEmpresaRequestDto } from '../interfaces/empresa-dto.interface';
import { Empresa, EmpresaForm } from '../interfaces/empresa.interface';

export function toEmpresa(dto: EmpresaDto): Empresa {
  return {
    razonSocial: dto.razon_social,
    ruc: dto.ruc,
    direccion: dto.direccion,
    telefono: dto.telefono ?? '',
    email: dto.email ?? '',
    logoUrl: dto.logo_url,
  };
}

export function toGuardarEmpresaRequest(form: EmpresaForm): GuardarEmpresaRequestDto {
  const telefono = form.telefono.replace(/\s+/g, '');
  const email = form.email.trim();
  return {
    razon_social: form.razonSocial.trim(),
    ruc: form.ruc.trim(),
    direccion: form.direccion.trim(),
    // PUT reemplaza: lo que no se envía queda vacío en el backend.
    ...(telefono && { telefono }),
    ...(email && { email }),
  };
}
