/** Datos de la empresa emisora tal como los usa la pantalla. */
export interface Empresa {
  razonSocial: string;
  ruc: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl: string | null;
}

/** Campos editables del formulario (el logo se maneja aparte). */
export interface EmpresaForm {
  razonSocial: string;
  ruc: string;
  direccion: string;
  telefono: string;
  email: string;
}

export type EmpresaErrores = Partial<Record<keyof EmpresaForm, string>>;

export const EMPRESA_FORM_VACIO: EmpresaForm = {
  razonSocial: '',
  ruc: '',
  direccion: '',
  telefono: '',
  email: '',
};

export const LOGO_TAMANO_MAXIMO = 1024 * 1024;
export const LOGO_TIPOS_PERMITIDOS = ['image/png', 'image/jpeg'];

/** Valida el formulario con las reglas del prototipo (y las del backend). */
export function validarEmpresa(form: EmpresaForm): EmpresaErrores {
  const errores: EmpresaErrores = {};

  if (!form.razonSocial.trim()) errores.razonSocial = 'Ingresar la razón social';

  if (!form.ruc.trim()) errores.ruc = 'Ingresar el RUC';
  else if (!/^(10|20)\d{9}$/.test(form.ruc.trim())) {
    errores.ruc = 'RUC inválido: 11 dígitos, inicia con 10 o 20';
  }

  if (!form.direccion.trim()) errores.direccion = 'Ingresar la dirección fiscal';

  // El backend exige exactamente 9 dígitos; los espacios del formato visual
  // ("01 234 5678") se quitan antes de enviar.
  if (form.telefono.trim() && !/^\d{9}$/.test(form.telefono.replace(/\s+/g, ''))) {
    errores.telefono = 'Teléfono inválido: 9 dígitos';
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errores.email = 'Email inválido';
  }

  return errores;
}

/** Mensaje de error del archivo de logo, o null si es válido. */
export function validarLogo(archivo: { type: string; size: number }): string | null {
  if (!LOGO_TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'Formato no admitido. Usar PNG o JPG';
  }
  if (archivo.size > LOGO_TAMANO_MAXIMO) return 'El archivo supera 1 MB';
  return null;
}
