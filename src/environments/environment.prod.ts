export const environment = {
  production: true,
  // Ruta relativa: en producción CloudFront sirve el frontend y enruta /api/* al
  // backend por el mismo origen. El backend sirve todo bajo el prefijo `api/v1`.
  apiUrl: '/api/v1',
  // Vacía: el pago con Culqi no se ofrece en producción hasta poner la llave real.
  culqiPublicKey: '',
};
