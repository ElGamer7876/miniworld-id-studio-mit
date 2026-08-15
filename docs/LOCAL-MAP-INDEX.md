# Índice local de mapas

El Studio revisa manualmente y en modo de solo lectura las carpetas `miniworddata410`,
`miniworddata402`, `miniworddata1` y `miniworddata110` bajo `%APPDATA%`. Sólo acepta
directorios con `w` seguido por un ID numérico, no sigue enlaces y no lee cuentas o
roles. Los binarios y archivos cifrados se dejan intactos.

La muestra real autorizada de 4.10 tenía `customui` vacío. Por eso las coincidencias
`uiid` y `elementid` de futuros archivos de texto se marcan como heurísticas y nunca se
inventan. Vincular un mapa guarda únicamente su ID, la versión de datos y referencias
de UI dentro del proyecto; ninguna ruta ni archivo se sube.
