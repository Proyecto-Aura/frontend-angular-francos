export interface CanalEmail {
  activo: boolean;
  readonly remitente: string;
  readonly servidorSmtp: string;
  readonly seguridad: string;
}

export interface CanalPortal {
  activo: boolean;
  destinatarios: string;
}

/** Usado solo al crear/editar: texto completo, sin recortar ni validar. */
export interface PlantillaForm {
  asunto: string;
  cuerpo: string;
}

export interface PlantillaCorreo {
  clave: string;
  nombre: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  variables: string[];
  actualizada: string;
}

export type PlantillaErrores = Partial<Record<keyof PlantillaForm, string>>;

export function plantillaFormDe(plantilla: PlantillaCorreo): PlantillaForm {
  return { asunto: plantilla.asunto, cuerpo: plantilla.cuerpo };
}

export function validarPlantilla(form: PlantillaForm): PlantillaErrores {
  const errores: PlantillaErrores = {};
  if (!form.asunto.trim()) errores.asunto = 'Ingresar el asunto';
  else if (form.asunto.trim().length > 150) errores.asunto = 'Máximo 150 caracteres';

  if (!form.cuerpo.trim()) errores.cuerpo = 'Ingresar el cuerpo del correo';
  return errores;
}
