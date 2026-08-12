# Historial de cambios

## 0.2.4 — 2026-08-11

- Actualiza el UID del autor a `106307078` en los scripts exportados.
- Seleccionar un activador ya no reconstruye el mapa ni cambia sus coordenadas.
- Mover el mapa conserva intactas las posiciones individuales de los activadores.
- Descarta saltos anómalos del puntero antes de escribir coordenadas.
- Repara una sola vez proyectos antiguos cuyos activadores quedaron superpuestos en `0,0`.

## 0.2.3 — 2026-08-11

- Sustituye el arrastre de activadores basado en Pointer Events por eventos de ratón estables en WebView2.
- Evita reconstruir el lienzo al soltar, eliminando el regreso visual hacia arriba.
- Guarda inmediatamente las coordenadas `x` y `y` de cada activador dentro de su proyecto.

## 0.2.2 — 2026-08-11

- Corrige el regreso del activador a su posición anterior al soltarlo.
- Separa las opciones para mover el mapa y mover los activadores.
- Calcula el movimiento desde el punto inicial y descarta `0,0` inválido.
- Conserva la última posición válida si WebView2 emite `pointercancel`.

## 0.2.1 — 2026-08-11

- Corrige el salto accidental de activadores hacia la coordenada `0,0`.
- Rechaza saltos anómalos enviados por WebView durante un arrastre.
- Usa desplazamientos incrementales y desactiva gestos táctiles del navegador en el asa.
- Mantiene el editor, proyectos y análisis Lua completamente locales.

## 0.1.1 — 2026-08-11

- Primera corrección estable del movimiento del mapa y activadores.
- Conserva proyectos múltiples, deshacer/rehacer y exportación Lua.

## 0.1.0 — 2026-08-11

- Primera compilación pública local del Studio.
- Editor visual de activadores, mapa, condiciones, variables y conversión Lua.

Las versiones 0.1.x se conservan únicamente como archivo histórico. Se recomienda 0.2.1 o posterior.
