## Qué hace

<!-- Resumen en 2-3 líneas. Si aplica, el ticket de Jira: OFT0-XXX -->

## Cómo probarlo

<!-- Pasos para que quien revise pueda verificarlo en local (ruta, usuario de prueba, etc.) -->

## Definition of Done

- [ ] `npm run build` sin errores (producción, sin exceder los budgets de tamaño)
- [ ] `npm run lint` sin errores nuevos en los archivos tocados
- [ ] `npm run test -- --watch=false` en verde
- [ ] Tests (`*.spec.ts` junto al archivo que prueban) para los componentes, servicios, guards o pipes nuevos o modificados
- [ ] Ejecuté los tests de verdad y pego la salida abajo
- [ ] Accesibilidad revisada en las plantillas tocadas (labels asociados, `alt` en imágenes, foco y roles)

## Salida de los tests

<!-- Pegar el resultado real de: npm run test -- --watch=false -->

```

```

## Capturas (si toqué UI)

<!-- Antes / después de la vista o componente afectado. Si no aplica, escribir "ninguna". -->

## Revisión propia

- [ ] Las rutas que lo requieren están protegidas por su guard (no quedó ninguna vista sensible abierta)
- [ ] Los formularios validan sus inputs (y muestran errores al usuario)
- [ ] Manejo de estados de carga y error en las llamadas HTTP (no se asume que siempre responden 2xx)
- [ ] No hay secretos, API keys ni tokens escritos en el código (terminan en el bundle, que es público)
- [ ] No dejé `console.log` de depuración
- [ ] Si usé `bypassSecurityTrust*` o `[innerHTML]`, verifiqué que el contenido sea seguro (riesgo de XSS)

## Superficie de ataque

<!--
Para la revisión de seguridad manual.
Vistas o rutas nuevas/modificadas y con qué rol se acceden.
Qué endpoints del backend consumen y qué datos sensibles se manejan en el cliente.
Si no aplica, escribir "ninguna".
-->

## Notas para quien revise

<!-- Decisiones de diseño no obvias, dudas abiertas, cosas que quedaron fuera -->
