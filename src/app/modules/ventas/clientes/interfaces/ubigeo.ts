// Copiado literal de la constante UBIGEO del diseño original — no es la lista
// completa de Perú (solo 6 departamentos), pero es la misma data que usa el
// diseño, así que el formulario se comporta exactamente igual.
export const UBIGEO: Record<string, Record<string, string[]>> = {
  Lima: {
    Lima: ['Cercado de Lima', 'Miraflores', 'San Isidro', 'Surco', 'La Molina', 'San Borja', 'Los Olivos'],
    Callao: ['Callao', 'Bellavista', 'La Perla'],
    Huaral: ['Huaral', 'Chancay'],
  },
  Piura: {
    Piura: ['Piura', 'Castilla', 'Veintiséis de Octubre'],
    Sullana: ['Sullana', 'Bellavista'],
    Paita: ['Paita', 'Colán'],
  },
  Arequipa: {
    Arequipa: ['Arequipa', 'Cayma', 'Yanahuara', 'Cerro Colorado'],
    Camaná: ['Camaná', 'Samuel Pastor'],
  },
  'La Libertad': {
    Trujillo: ['Trujillo', 'Víctor Larco Herrera', 'La Esperanza'],
    Pacasmayo: ['San Pedro de Lloc', 'Pacasmayo'],
  },
  Cusco: {
    Cusco: ['Cusco', 'Wanchaq', 'San Sebastián'],
    Urubamba: ['Urubamba', 'Ollantaytambo'],
  },
  Lambayeque: {
    Chiclayo: ['Chiclayo', 'José Leonardo Ortiz', 'La Victoria'],
    Lambayeque: ['Lambayeque', 'Mórrope'],
  },
};

export const departamentos = (): string[] => Object.keys(UBIGEO);

export const provinciasDe = (departamento: string): string[] =>
  departamento && UBIGEO[departamento] ? Object.keys(UBIGEO[departamento]) : [];

export const distritosDe = (departamento: string, provincia: string): string[] =>
  departamento && provincia && UBIGEO[departamento]?.[provincia] ? UBIGEO[departamento][provincia] : [];