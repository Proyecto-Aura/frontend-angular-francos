// Desarrollo: apunta al backend local. El build de producción reemplaza este
// archivo por environment.prod.ts (fileReplacements en angular.json).
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  // Llave PÚBLICA de Culqi, SOLO de pruebas (pk_test_...). Es pública por diseño:
  // la secreta vive solo en el backend. Vacía o de producción (pk_live_) = el
  // pago con Culqi no se ofrece.
  culqiPublicKey: '',
};
