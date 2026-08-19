# Historial de cambios

## 1.1.0-beta.4 — 2026-08-19

- Corrige el selector y valor inicial de jugador cuando el evento entrega campos con el prefijo `e.`.
- Evita que un jugador válido se degrade a `nil` al crear o editar una acción API.

## 1.1.0-beta.3 — 2026-08-16

- Añade respaldo completo y validado de proyectos, preferencias y plantillas locales.
- Restaura como copias sin sobrescribir proyectos ni colisionar IDs.
- Serializa el autoguardado y muestra Guardando, Guardado o un error persistente con reintento.
- Añade una guía bilingüe y accesible de atajos mediante botón, `Ctrl+/` y paleta de comandos.
- Evita ejecutar atajos globales mientras se escribe en entradas, selectores o áreas de texto.

## 1.1.0-beta.2 — 2026-08-16

- Completa la localización funcional Español / English en todas las vistas principales.
- Traduce nombres y frases de todas las acciones API, eventos, parámetros y atributos seleccionables.
- Traduce diagnósticos, análisis Lua, mapas locales, configuración y recuperación asíncrona.
- Mantiene intactos el código Lua, IDs técnicos, títulos, nombres de activadores y valores escritos por el usuario.
- Añade pruebas automáticas de cobertura del catálogo y de traducciones dinámicas seguras.

## 1.1.0-beta.1 — 2026-08-16

- Añade selector persistente Español / English y una primera traducción de la interfaz del Studio.
- En Básico e Intermedio, jugador, atributo, booleanos y estados usan opciones seguras; los valores libres continúan editables.
- Las opciones y valores iniciales ahora dependen de los datos disponibles en el evento activo.
- Añade sugerencias de datos del evento y variables sin convertir coordenadas, cantidades, IDs o texto en menús cerrados.
- Incorpora simulación local, edición anidada completa, portapapeles de bloques, recuperación, búsqueda, comandos, métricas y preferencias de API desarrolladas durante el ciclo 1.0.

## 1.0.0-beta.2 — 2026-08-16

- Conserva exactamente las coordenadas de cada activador al abrir un proyecto.
- El zoom ya no reconstruye el mapa ni desplaza tarjetas a `0,0`.
- Respeta posiciones superpuestas elegidas por el usuario en proyectos modernos.
- Migra una sola vez los proyectos antiguos dañados sin alterar los nuevos.
- Incluye pruebas de dos activadores, zoom y doble reinicio.

## 0.3.2 — 2026-08-16

- Lleva la misma corrección de coordenadas y zoom al canal Stable.
- Mantiene 0.3.1 disponible como versión anterior.

## 1.0.0-beta.1 — 2026-08-15

- Añade un índice manual y de solo lectura para mapas locales de Mini World.
- Reconoce únicamente carpetas `w` seguidas por un ID numérico.
- Revisa las instalaciones 4.10, 4.02, 1.x y 1.10 sin leer cuentas o roles.
- Vincula opcionalmente un mapa a un proyecto y sugiere IDs de interfaz detectados.
- Nunca descifra, modifica ni sube datos del juego.
- Publicación de prueba: no sustituye a la versión Stable 0.3.1.

## 0.3.1 — 2026-08-14

- Hace idempotente y seguro el canje de autorización de la edición conectada.
- Cancela el sondeo de cuenta cuando se cierra su ventana.
- Distingue autorizaciones rechazadas, vencidas y consumidas por otro cliente.
- Añade la introducción visual de Studio a la página oficial.
- Mantiene la edición MIT completamente local y sin conexiones externas.

## 0.3.0 — 2026-08-11

- Convierte las acciones en frases visuales con un campo por parámetro.
- Añade valores iniciales, argumentos opcionales y resultados Lua sugeridos.
- Amplía el catálogo a 52 acciones documentadas, incluidas las APIs de interfaz.
- Permite editar argumentos avanzados sin romper cadenas ni tablas con comas.
- Comprueba automáticamente la generación Lua de todas las acciones.

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
