# Mini World ID Studio 1.1.0 Beta — MIT Local

[English documentation](README.en.md) · **Documentación en español**

[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-35ad82.svg)](LICENSE)
[![Verificación](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml/badge.svg)](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml)
[![Release](https://img.shields.io/github/v/release/ElGamer7876/miniworld-id-studio-mit)](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest)

Editor Tauri 2 completamente local para construir activadores y exportar Lua.
Esta edición está preparada para publicarse como repositorio independiente en
GitHub bajo la licencia MIT.

Descarga Stable desde [GitHub Releases](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest). La versión `1.1.0-beta.2` completa la localización funcional del ciclo bilingüe y no reemplaza una versión estable. Consulta [CHANGELOG.md](CHANGELOG.md) para conocer los cambios.

La interfaz incluye un selector persistente **Español / English**. El Studio traduce navegación, editor, catálogo API, eventos, diagnósticos, mapas locales y configuración, pero conserva sin cambios el código Lua, los nombres técnicos de API y el contenido escrito por el usuario.

El release `0.3.2` ofrece instalador y portable para Windows x64 de dos
ediciones. El código fuente de este repositorio corresponde únicamente a la
edición MIT local:

| Edición | Conexión | Cuenta Mini World ID | Proyecto abierto |
| --- | --- | --- | --- |
| MIT local | Sin red | No | Sí, licencia MIT |
| Conectada | Servicios de `miniworld.id` | Sí | Binarios distribuidos por separado |

Incluye el mismo mapa con movimiento, editor de bloques, condiciones,
variables, catálogo Mini World, conversión Lua, proyectos múltiples,
deshacer/rehacer y análisis estático que la edición conectada.

El editor ofrece tres niveles reversibles por proyecto. Básico muestra solo la
frase y las opciones necesarias; Intermedio añade la selección de API; Avanzado
habilita resultados Lua, argumentos técnicos, etiquetas y Lua libre. Las
variables pueden ser locales o globales y su renombrado actualiza referencias
sin alterar comentarios, cadenas ni nombres parciales.

En Básico e Intermedio, jugador, atributos oficiales, booleanos y estados
conocidos se eligen mediante menús. Cantidades, IDs, coordenadas, texto y
expresiones libres siguen siendo campos editables; jugador y atributo también
aceptan un valor o variable personalizados.

Cada activador incluye un simulador local con datos de evento JSON, condiciones,
variables, repeticiones y registro paso a paso de API. Nunca ejecuta Lua ni
envía llamadas y se detiene a los 250 pasos, 50 repeticiones o 12 niveles.

Los bloques internos de `Si` y `Repetir` son editores completos: admiten los
mismos parámetros, anidación, reordenamiento, movimiento al nivel principal y
eliminación reversible. El arrastre rechaza ciclos en el árbol.

Cada bloque dispone de un portapapeles interno para copiar, cortar, pegar
después, pegar dentro y duplicar. Las copias regeneran todos los IDs del árbol y
las operaciones que modifican el proyecto se pueden deshacer.

También incluye un centro local de problemas para eventos, funciones,
variables, llamadas API, parámetros y activadores superpuestos, con
correcciones rápidas que se pueden deshacer.

Los puntos de recuperación se guardan únicamente en el almacén local. Se
deduplican, se limitan a 20 por proyecto y 16 MB en total, y siempre se
restauran como una copia para no sobrescribir el trabajo actual.

`Ctrl+K` abre una búsqueda local de activadores, eventos, variables,
condiciones, acciones y llamadas API, incluidos los bloques anidados.

`Ctrl+Shift+P` o `F1` abre una paleta de comandos local para cambiar de vista,
crear activadores, guardar, exportar, deshacer y abrir recuperación. Se puede
usar completamente con teclado mediante las flechas y `Enter`.

Los paneles Proyectos e Inspector pueden ocultarse de forma independiente. El
Studio recuerda el diseño localmente; `Ctrl+Shift+F` activa o desactiva el modo
enfoque, `Ctrl+B` controla Proyectos y `Ctrl+Alt+I` controla el Inspector.

El preview web utiliza almacenamiento del navegador separado de la aplicación
instalada. Sirve para probar proyectos, preferencias, recuperación e
importación/exportación, pero nunca obtiene acceso a AppData; el indexador de
mapas locales requiere ejecutar la versión Tauri.

Los activadores pueden guardarse como plantillas locales. Al reutilizarlos, el
Studio regenera todos los IDs internos para que las copias sean independientes.

La vista Problemas incluye métricas estructurales locales por proyecto y
activador. El resumen copiable no contiene el código Lua.

El catálogo de API permite marcar métodos favoritos y mantiene una lista de
llamadas recientes. Estas preferencias son locales, no forman parte del
proyecto y no generan conexiones de red.

## Novedades de 1.0.0 Beta 2

- Corrige el salto de varios activadores a `0,0` al usar zoom.
- Conserva las coordenadas exactas después de cerrar y volver a abrir Studio.
- Añade pruebas de persistencia con dos activadores y posiciones superpuestas.

## Incluido desde Beta 1

- Vista de mapas locales con escaneo iniciado únicamente por el usuario.
- Compatibilidad con `miniworddata410`, `miniworddata402`, `miniworddata1` y
  `miniworddata110` bajo `%APPDATA%`.
- Identificación estricta de directorios `w<ID numérico>`; nombres como `www`
  se descartan.
- Vínculo opcional entre un mapa y un proyecto del Studio.
- Sugerencias locales para `uiid` y `elementid` cuando aparecen en texto legible.
- Sin descifrado, escritura, analíticas ni subida de archivos del juego.

Detalles técnicos: [docs/LOCAL-MAP-INDEX.md](docs/LOCAL-MAP-INDEX.md).

## Novedades de 0.3.1

- La edición conectada recupera de forma segura un canje de autorización si la
  primera respuesta se pierde durante la comunicación con `miniworld.id`.
- La espera de autorización se cancela correctamente al cerrar la ventana y ya
  no deja solicitudes pendientes que confundan al usuario.
- Los estados rechazado, vencido y consumido por otro cliente muestran mensajes
  diferentes.
- La edición MIT mantiene intacta su política sin red, cuentas ni analíticas.

## Novedades de 0.3.0

- Catálogo de 52 acciones con valores y cadenas de uso.
- Un campo editable por parámetro, en lugar de una sola lista separada por comas.
- Valores contextuales como `e.eventobjid`, `e.x`, `e.y` y `e.z`.
- Parámetros opcionales y nombres sugeridos para los resultados Lua.
- Acciones de interfaz para abrir, cerrar, cambiar texto, textura, tamaño,
  fuente, color, visibilidad, giro, transparencia, estado, posición y escala.
- Editor avanzado que conserva expresiones, tablas y cadenas con comas.
- Verificación automática de la generación Lua de todas las acciones.

Ejemplos de bloques:

```text
Abrir interfaz [ID_DE_INTERFAZ] en [e.eventobjid]
Entregar [1] del objeto [1001] a [e.eventobjid]
Mover [e.eventobjid] a X [e.x], Y [e.y], Z [e.z]
```

Los proyectos creados con versiones anteriores siguen siendo compatibles. Las
llamadas importadas pueden editarse mediante sus campos visuales o desde
“Argumentos Lua avanzados”.

## Privacidad

- No contiene cliente HTTP.
- La CSP de producción no permite conexiones externas.
- No usa login, cookies, analíticas, telemetría ni fingerprint.
- Los proyectos se guardan localmente o en una ruta elegida por el usuario.
- El Lua se analiza como texto y nunca se ejecuta.

## Desarrollo en Windows

Se necesitan Rust, Node.js, Microsoft C++ Build Tools con la carga “Desarrollo
para escritorio con C++” y WebView2.

```powershell
npm.cmd install
npm.cmd run tauri:dev
```

## Compilar MSI y NSIS

```powershell
npm.cmd run tauri:build
```

Formatos: `.mwstudio` para el proyecto visual y `.lua` para el código generado.

## Verificación

```powershell
npm.cmd run check:core
```

El flujo incluido en `.github/workflows/check.yml` comprueba el frontend y Rust
en Windows antes de aceptar cambios.
