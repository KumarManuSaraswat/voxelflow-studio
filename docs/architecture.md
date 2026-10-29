# Architecture and recovery

```text
Artist panel ───────────────────────────────┐
                                           ▼
Codex / Inspector / authorized tunnel → MCP stdio server
                                           │
                                   authenticated client WebSocket
                                           │
                                  127.0.0.1 bridge
                                           │
                                   authenticated editor WebSocket
                                           ▼
                             validated Workflow + approval ledger
                                           │
                             Blockbench adapter + native Undo
                                           │
                                 real project / Save dialog
```

The diagram's panel feeds the same Workflow directly; the bridge is optional for offline artist controls. `packages/core/src` contains deterministic schemas, geometry, texture encoding, rig detection, clips, validation, export, and operation state transitions. `packages/blockbench-plugin/src/editor` adapts those data to installed editor APIs. The UI uses native Panel/Dialog controls and Blockbench theme variables. `packages/mcp-server` exposes 12 SDK tools and a guided prompt; it never generates model geometry itself.

## Approval and transactions

Every modifying command is parsed before it can become a proposal. The proposal stores validated arguments and a bounded snapshot stamp of the active project, UUID, and Undo position. An approval expires after five minutes and is refused if the project changed. There is one pending proposal at a time. Request ID plus arguments provides session-local deduplication; a changed payload under an existing ID is an error.

Applying a proposal yields briefly to draw progress, then performs bounded synchronous editor work. Native Undo captures affected elements, textures, groups, and animations. Partial animation additions are included in rollback. A failed creation rolls back its new tab and reselects the prior project when available. A failed edit cancels its native Undo transaction. Existing clips retain their native identities during regeneration so Undo does not rename them. Empty bone channels are recorded explicitly to make native Undo/redo clear newly added tracks. Terminal operations discard snapshot plans; recent summaries remain in the ledger. Disconnect cancels pending remote proposals.

Undo deliberately refuses to cross a subsequent artist edit or a different active project. Export produces bytes only after quality gates and package consistency pass, then uses Blockbench's native binary Save dialog. The MCP caller cannot choose an arbitrary filesystem path. Cancelling Save is recorded as cancellation. Exported files are not deleted by Undo.

## Local boundary

The bridge binds only `127.0.0.1`. It validates Host, rejects unrelated browser origins, requires a freshly generated cryptographic session token, and accepts a single authenticated editor. Allowed origins are the desktop editor's file/null context or the originless Node client. The token is kept in plugin memory and in the ignored local bridge config for companion processes; filesystem access by the same OS user remains a trust boundary. On Windows, Node's `0600` file mode does not replace your user-directory ACLs.

Authenticated calls still pass a strict command allowlist and Zod schemas in the bridge/editor path. WebSocket messages are capped at 2 MB, pending bridge calls are capped, authentication has a timeout, and ping/pong detects dead connections. Editor capture rejects oversized snapshots and scene counts before large transforms. Models are limited to the supported size range and preset complexity. There is no general filesystem, shell, browser navigation, network fetch, or script-execution MCP tool.

The companion has access only to its local connection config plus stdio/WebSocket transport in normal operation. The desktop plugin has the privileges of an installed Blockbench plugin, so installation still uses Blockbench's native trust prompt. Token checks do not protect against an already compromised same-user machine or malicious installed editor plugin.

## Verification layers

Pure tests cover specifications, generated geometry/rigs, texture references, pixel preservation, clip effectiveness and closure, invalid imports, serializers, and package references. Real socket tests exercise handshake, origin/token rejection, disconnects, timeouts, and command rejection. Workflow tests isolate approval state transitions and failure/cancellation. A spawned stdio server is negotiated by the official MCP client. Actual Blockbench testing separately verifies live renderer transforms, native keyframes, approval, recoloring/Undo, and saved ZIP bytes.

The development-only installed-source inspection script and recorded native renderer evidence are not part of the MCP execution path. No debugging port is required for normal plugin usage.

## API references

Implemented against installed Blockbench 5.2.2 and official `blockbench-types` 5.2.1. The runtime plugin class is `BBPlugin` and native animation class is `BBAnimation`; generic DOM globals with similar names are not used. References consulted: [plugin guide](https://blockbench.net/wiki/docs/plugin/), [API docs](https://web.blockbench.net/docs/), [official source](https://github.com/JannisX11/blockbench), and [MCP SDK server guide](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server).
