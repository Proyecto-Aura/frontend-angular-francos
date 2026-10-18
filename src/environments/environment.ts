// TODO: cuando haya build de produccion real, separar en environment.ts /
// environment.production.ts con fileReplacements en angular.json. Por ahora
// un solo archivo, apuntando al backend local de desarrollo.
export const environment = {
  apiUrl: 'http://localhost:3000/api/v1',
  // Llave PÚBLICA de Culqi, SOLO de pruebas (pk_test_...). Es pública por diseño:
  // la secreta vive solo en el backend. Vacía o de producción (pk_live_) = el
  // pago con Culqi no se ofrece.
  culqiPublicKey: '',
};
