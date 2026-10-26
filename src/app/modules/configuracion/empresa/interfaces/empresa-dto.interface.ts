/** Respuesta de GET/PUT /empresa y de POST/DELETE /empresa/logo. */
export interface EmpresaDto {
  id: number;
  razon_social: string;
  ruc: string;
  direccion: string;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  estado: boolean;
  es_emisora: boolean;
  created_at: string;
  updated_at: string;
}

/** Cuerpo de PUT /empresa. No lleva logo: ese se maneja con /empresa/logo. */
export interface GuardarEmpresaRequestDto {
  razon_social: string;
  ruc: string;
  direccion: string;
  telefono?: string;
  email?: string;
}
