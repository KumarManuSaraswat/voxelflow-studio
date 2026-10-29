# Verification record

Tested on 2026-10-29 with Windows, Node 24.11.1, npm 11.6.2, and the installed Blockbench desktop 5.2.2. Plugin typings are the official `blockbench-types` 5.2.1. The graphical test used a separate Blockbench user-data directory, not the artist's normal settings.

## Automated results

`npm run check` completed successfully after the final animation-identity correction:

```text
TypeScript: no errors
Test Files: 5 passed (5)
Tests:      59 passed (59)
Build:      Blockbench plugin and MCP companion generated
Examples:   43 cubes, 11 bones, 3 clips, 9 package files, 0 failed checks
```

The suite includes rejected malicious/unknown/oversized parameters, generated geometry, hierarchy and pivot failures, PNG/UV failures, painted pixel preservation, loop closure and opposing gait, invalid tracks, export references, duplicate requests, stale approvals, cancellation/failure handling, real WebSocket auth/origin/allowlist/disconnect/timeout behavior, and a real spawned MCP stdio handshake using the official SDK client.

The socket tests require a local environment allowing loopback listeners. Restricted-sandbox permission failures were resolved by running the tests in the authorized local environment; they were not treated as passing tests.

`npm audit --omit=dev --json` reported **0 runtime advisories**. The full development tree has two low-severity advisories in the Vue 2 dependency chain of the official `blockbench-types` package. Vue is not bundled in the delivered plugin or companion.

The release ZIP was extracted into an isolated directory and installed using `npm ci --omit=dev --ignore-scripts --offline` from the populated npm cache. Its built companion then discovered all 12 tools, connected to the real editor, and returned 5 passed / 1 warning / 0 failed quality checks. [Release smoke evidence](evidence/release-smoke.json) records the result. Archive entries were checked for private test directories and the live session token; none were included.

## Actual editor results

These checks used the installed Blockbench renderer, real native APIs, real MCP stdio/WebSocket traffic, and actual clicks on approval/Save dialogs:

| Check | Observed result |
| --- | --- |
| Plugin load/reload | Native panel, five stages, Tools action, connection dialog |
| MCP discovery | 12 tools via the official SDK client |
| Create after approval | New Bedrock tab, 43 cubes, 11 bones, PNG 64×16 with texture error 0 |
| Native keyframes | Idle 20, walk 40, attack 25; total 85 |
| Preview | All three clips selected/played in native animation timeline |
| Actual mesh motion | Recorded group rotation/position transforms change over each clip |
| Loop boundaries | Idle and walk start/end transforms match exactly in sampled renderer state |
| Palette edit | MCP-approved color update applied; native Undo restored it |
| Speed edit | 1.5× timing changes lengths from 3 / 1.2 / 1 seconds to 2 / 0.8 / 0.666667; cube UUIDs/positions and PNG preserved |
| Live validation | 5 passed, 1 explicit runtime-unverified warning, 0 failures |
| Live export | Native Save dialog wrote a real ZIP with all 10 expected files |
| Export integrity | Unzipped JSON/files/reference checks pass; source contains 43 cubes, 11 bones, 85 keyframes |
| Native source round trip | Exported `.bbmodel` opened in a fresh Blockbench tab with all geometry, texture, bones, and three named clips |

The final speed/Undo test caught a native-name collision when animation objects were replaced. The implementation now updates existing animation objects and records empty bone channels for Undo; clip identity and canonical names are retained. A scoped native snapshot listener reapplies saved clip durations after keyframes load, correcting Blockbench's length clamping on shorter Redo operations. [Native regression evidence](evidence/native-undo-redo.json) confirms exact Undo/redo equality, including clip UUIDs, names, lengths, keyframe UUIDs, timestamps, channels, and transform values. Two additional unit tests verify the duration correction and that unrelated artist history is untouched.

Evidence files: [idle motion](evidence/idle-motion.json), [walk motion](evidence/walk-motion.json), [attack motion](evidence/attack-motion.json), [speed update](evidence/speed-update.json), [saved ZIP inspection](evidence/live-export.json), and [interface screenshot](evidence/voxelflow-studio.png). Motion snapshots include actual mesh transforms at start, quarter, half, and end; they are diagnostic samples, not an exhaustive motion-quality evaluation.

## Not verified

Minecraft execution, behavior-pack integration, actual attack triggers, emissive rendering, macOS/Linux, arbitrary imported rigs, and account-level ChatGPT/Codex natural-language sessions remain unverified. Inspector instructions are supplied; the recorded MCP execution used the equivalent official SDK client rather than the Inspector browser UI. The current Codex CLI `mcp add` syntax was also checked against the installed CLI's help.

No mock editor, fake tool success, or prerecorded animation stands in for the production execution path. Workflow unit tests use mocks only to isolate state-machine failure cases. The [manual checklist](manual-smoke-test.md) distinguishes further reproducible checks from the results recorded here.
