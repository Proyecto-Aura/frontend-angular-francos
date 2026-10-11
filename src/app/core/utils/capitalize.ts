// El backend manda los roles crudos tal cual estan en la BD ("admin",
// "ventas"...), sin label bonito — esto es solo una mayuscula inicial, no un
// diccionario de nombres (evita inventar textos que despues no calcen con
// roles nuevos que agreguen).
export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
