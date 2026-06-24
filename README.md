# Gestión MP 2026 — Mantenciones Preventivas de Equipos

Aplicación web (HTML + CSS + JavaScript, sin dependencias de servidor) que
implementa el **Sistema de Gestión MP 2026** descrito en la especificación
*"Flujo Sistema Gestión MP 2026"*. Permite cargar la base de equipos desde la
planilla, registrar mantenciones preventivas y correctivas, gestionar
pendientes y monitorear la operatividad de los equipos en tiempo real.

## Cómo usar

1. Abra `index.html` en un navegador moderno (Chrome, Edge, Firefox).
   No requiere instalación ni servidor.
2. La primera vez se cargan **datos de demostración** para ver el sistema
   funcionando. Puede reemplazarlos en la pestaña **Datos**:
   - **Cargar planilla**: importa `ProgramaciónMP2026` (hojas `PMP_2026` y
     `Registro_MP-2026`).
   - **Backup / Restaurar**: respaldo completo en JSON.
   - **Borrar todo**: reinicia los datos.

Los datos se guardan localmente en el navegador (`localStorage`). Nada se
envía a internet (salvo la carga de la librería SheetJS desde CDN para
leer/escribir Excel; el resto funciona sin conexión).

## Vistas (según los pasos de la especificación)

| Vista | Paso(s) | Descripción |
|-------|---------|-------------|
| **Equipos** | 1, 2 | Base de equipos + columnas calculadas (Estado, Días en estado, Última actualización, Pendientes), filtros tipo Excel. |
| **Detalle del equipo** | 7, 8, 9, 10 | Datos copiables, historial unificado por mes, pendientes y expedientes correctivos con línea de tiempo, y los tres botones de acción. |
| **Plan de Mantenimiento** | 3, 4, 5, 6, 13 | Una fila por equipo y mes uniendo programación PMP, registro de planilla y app. |
| **Pendientes** | 9 | Bandeja con urgencia, métricas, acciones rápidas, tareas y bitácora. |
| **Operatividad** | 12 | Equipos que requieren atención + registro en un clic del siguiente paso. |
| **Correctivo** | 10, 15 | Vista global por expediente (folio SIGEM) con métricas de ciclo. |
| **Datos** | 1, 11 | Importar planilla, exportar registros, respaldo y restauración. |
| **Grabar** (barra superior) | 14 | Grabación local de la sesión para mejora continua. |

## Reglas de negocio implementadas

- Serie y N° Inventario se tratan **como texto**, conservando ceros a la
  izquierda en carga, vistas y exportaciones.
- Identificador único = Serie o, en su defecto, N° Inventario (el ID es solo
  el orden de fila).
- Regla **Oficial / Borrador**: lo cargado de planilla es Oficial; un borrador
  que reaparece en la planilla recargada pasa a Oficial.
- Sugerencia automática del código de programación según la planilla, con
  prevalencia de la elección manual.
- Generación automática de pendientes desde mantenciones (tipo y plazo según
  la causal C1–C8; reprogramación a 30 días para C1, C5, C6, C7, C8).
- Estado del equipo derivado del **último evento registrado**
  (preventivo, correctivo o planilla FS/NU/Baja).
- Flujo del expediente correctivo con etapas, envío/retorno de servicio
  técnico y bitácora auditable de avances.

## Estructura del proyecto

```
index.html
assets/
  css/styles.css
  js/
    core/    utils, store (datos + localStorage), ui (tabla/modal/toast),
             excel (import/export), seed (demo), grabacion (Paso 14)
    views/   equipos, detalle, plan, pendientes, operatividad, correctivo,
             datos, forms (preventivo/pendiente/correctivo)
    app.js   enrutador e inicialización
```
