# Mini World ID Studio 1.1.0 Beta — MIT Local

**English documentation** · [Documentación en español](README.md)

[![MIT License](https://img.shields.io/badge/license-MIT-35ad82.svg)](LICENSE)
[![Checks](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml/badge.svg)](https://github.com/ElGamer7876/miniworld-id-studio-mit/actions/workflows/check.yml)
[![Release](https://img.shields.io/github/v/release/ElGamer7876/miniworld-id-studio-mit)](https://github.com/ElGamer7876/miniworld-id-studio-mit/releases/latest)

Mini World ID Studio is a Tauri 2 desktop editor for building Mini World triggers and exporting Lua locally. This repository contains the offline MIT edition; it does not require a Mini World ID account and does not send projects or map data over the network.

The interface provides a persistent **Español / English** selector. Navigation and Studio controls are translated while Lua code, API identifiers, project content, IDs, and user-entered values remain unchanged.

## Editor levels

- **Basic:** visual sentences and safe choices only.
- **Intermediate:** adds Mini World API selection.
- **Advanced:** exposes Lua arguments, result targets, labels, and free-form Lua.

In Basic and Intermediate modes, closed domains such as player references, official attributes, booleans, and player states use selectors. Truly free values—messages, numbers, coordinates, IDs, expressions, and custom variables—remain editable. Event references and new-action defaults are filtered according to the active event.

## Main features

- Full recursive trigger editor with nested If and Repeat blocks.
- Drag, reorder, copy, cut, paste, duplicate, undo, and redo.
- Local trigger simulator that never executes Lua or calls Mini World services.
- Safe variable scopes and reference-aware renaming.
- Static diagnostics, project metrics, search, and command palette.
- Local recovery points and reusable trigger templates.
- Favorite and recent API methods.
- Read-only local map indexing when running the Tauri app.
- Browser preview storage separated from the installed desktop application.

## Privacy and safety

The MIT edition is local-only. It does not execute imported Lua. Unknown instructions remain visible as free-form Lua for manual review. Projects are limited to 2.5 MB, and simulation has strict step, repeat, and nesting limits.

## Development

```powershell
npm install
npm run check:core
npm run build
npm run tauri:build
```

Requirements: Node.js 20+, Rust stable, and the Windows prerequisites required by Tauri 2.

## Release policy

The `1.1.0` cycle uses four public prereleases: Beta 1, Beta 2, Beta 3, and Beta 4. A beta is published after three regular fixes or immediately after one important fix. Stable is published only after the beta cycle passes validation.

See [CHANGELOG.md](CHANGELOG.md) for detailed release history. This project is licensed under the [MIT License](LICENSE).
