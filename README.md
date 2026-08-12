# Mini World ID Studio 0.2.3 — MIT Local

[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-35ad82.svg)](LICENSE)
[![Verificación](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml/badge.svg)](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml)
[![Release](https://img.shields.io/github/v/release/ElGamer7876/miniworld-id-studio-mit)](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest)

Editor Tauri 2 completamente local para construir activadores y exportar Lua.
Esta edición está preparada para publicarse como repositorio independiente en
GitHub bajo la licencia MIT.

Descarga la versión estable desde [GitHub Releases](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest). Consulta [CHANGELOG.md](CHANGELOG.md) para conocer los cambios y versiones históricas.

Incluye el mismo mapa con movimiento, editor de bloques, condiciones,
variables, catálogo Mini World, conversión Lua, proyectos múltiples,
deshacer/rehacer y análisis estático que la edición conectada.

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
