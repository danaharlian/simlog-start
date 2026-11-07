# 0028 One MCP config: `.mcp.json` for Claude Code and VS Code

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked to delete `.vscode/mcp.json` and enable `chat.mcp.workspaceRootConfig.enabled`; the installer and test changes are the agent's
- Amends: ADR 0027

## Context

ADR 0027 shipped the shadcn server in two files, one per client. Each server had to be kept in both, and Context7 was only ever in `.mcp.json`.

Read on 2026-11-01:

- **VS Code labels `.vscode/mcp.json` deprecated** in its guided flow; the destination remains for compatibility (VS Code docs).
- **VS Code 1.144.0 reads the workspace-root `.mcp.json`.** Its bundle has a discovery class that watches `.mcp.json` in each workspace folder and takes no configuration service.
- **`chat.mcp.workspaceRootConfig.enabled` does not gate that reading.** In the bundle it controls whether the add-server flow and the editor action offer the root file. The docs agree: "Existing `.mcp.json` files remain available when this setting is off." Its default is `true`, tagged experimental.
- **A stdio server in `.mcp.json` needs no `type`:** the bundle infers `stdio` from `command`, and the docs' portable example omits it.

## Decision

- **`.mcp.json` is the only MCP config we ship.** `.vscode/mcp.json` is deleted from this repo and from the installer.
- **This repo sets the setting to `true` in `.vscode/settings.json`,** as the owner asked. The installer does not ship that file: the setting only changes where the add-server flow writes, and an app's editor settings are its own.

## Consequences

- A server is declared once, and VS Code gets Context7 and shadcn from the same file.
- **An app that already has `.vscode/mcp.json`:** the installer deletes the file on its next run if the file matches what it recorded, and reports it for a person to handle if edited. A file the installer never wrote is left alone.
- **Risk: a VS Code version with no root discovery gets no servers from us.** Nothing limits this but the version check under Not verified. An app on such a version can add its own `.vscode/mcp.json`.
- **Risk: `.mcp.json` cannot use VS Code input variables, environment files, or per-server sandboxing.** Neither server needs them today. A server that does needs a new decision.
- A person still approves the server in each client before it starts.

## Not verified

- **The servers inside a real VS Code chat session.** The evidence is the 1.144.0 bundle and the docs; no session connected to them.
- **The first VS Code version that reads the root file.** PR microsoft/vscode#338054 turned the setting on by default for 1.140.0; it does not say when discovery arrived.
- **The setting's scope as a workspace setting.** The bundle declares scope `4`, which is **Inferred** to be window scope, which a workspace can set.

## Alternatives considered

- **Keep both files.** Works on older versions, but keeps two lists to sync and a destination VS Code labels deprecated. Rejected by the owner.
- **Ship `.vscode/settings.json` to apps.** Needs a merge into a file teams own, for a setting that defaults to `true`. Rejected.

## Verification

Docs consulted (2026-11-01): https://code.visualstudio.com/docs/agents/reference/mcp-configuration; https://code.visualstudio.com/docs/copilot/customization/mcp-servers; https://github.com/microsoft/vscode/pull/338054; `out/vs/workbench/workbench.desktop.main.js` of the installed VS Code 1.144.0.

Run on 2026-11-01 on macOS: `test-gates.mjs` 91 of 91, 1 of them new; `test-check-docs.mjs` 75 of 75; `check-docs.mjs` 0 errors and 11 warnings; `bash scripts/test-real-app.sh` exit 0, with the shadcn server answering from `.mcp.json` in a real app.
