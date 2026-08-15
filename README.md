# Mini World ID Studio 0.3.0 — MIT Local

[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-35ad82.svg)](LICENSE)
[![Verificación](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml/badge.svg)](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml)
[![Release](https://img.shields.io/github/v/release/ElGamer7876/miniworld-id-studio-mit)](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest)

Editor Tauri 2 completamente local para construir activadores y exportar Lua.
Esta edición está preparada para publicarse como repositorio independiente en
GitHub bajo la licencia MIT.

Descarga la versión estable desde [GitHub Releases](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest). Consulta [CHANGELOG.md](CHANGELOG.md) para conocer los cambios y versiones históricas.

El release `0.3.0` ofrece instalador y portable para Windows x64 de dos
ediciones. El código fuente de este repositorio corresponde únicamente a la
edición MIT local:

| Edición | Conexión | Cuenta Mini World ID | Proyecto abierto |
| --- | --- | --- | --- |
| MIT local | Sin red | No | Sí, licencia MIT |
| Conectada | Servicios de `miniworld.id` | Sí | Binarios distribuidos por separado |

Incluye el mismo mapa con movimiento, editor de bloques, condiciones,
variables, catálogo Mini World, conversión Lua, proyectos múltiples,
deshacer/rehacer y análisis estático que la edición conectada.

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
