// TODO: cuando haya build de produccion real, separar en environment.ts /
// environment.production.ts con fileReplacements en angular.json. Por ahora
// un solo archivo, apuntando al backend local de desarrollo.
export const environment = {
  apiUrl: 'http://localhost:3000/api/v1',
};
