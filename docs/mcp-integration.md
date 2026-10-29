# MCP connections

VoxelFlow implements an actual MCP stdio server using the official TypeScript SDK. The installed desktop plugin connects to a separate authenticated loopback bridge. There is no public HTTP listener and no AI API key requirement for the plugin, bridge, or Inspector demo.

## Start the editor side first

From the repository root:

```powershell
npm ci
npm run build
npm run bridge
```

Load `dist/voxelflow_studio.js` in Blockbench desktop. In VoxelFlow, click Connect and paste the printed session token. Leave the bridge terminal running. Only one editor can connect to this bridge at a time.

The companion reads `.local/bridge.json` relative to its installed project root, independent of the host's working directory. Do not move `server.js` out of `packages/mcp-server/dist` by itself. The bridge generates this ignored file; do not commit or share it. Optional `VOXELFLOW_TOKEN` and `VOXELFLOW_PORT` environment variables override the file. The token must be 64 hexadecimal characters. A new bridge run generates a new token.

## MCP Inspector

In a second terminal at the project root:

```powershell
npx @modelcontextprotocol/inspector node packages/mcp-server/dist/server.js
```

Open the local Inspector URL printed by the official Inspector, connect the stdio transport, and list tools. Expect 14 tools. Call `get_editor_status` with `{}` and require `connected: true` before proceeding. `npm run demo -- --status` provides the same handshake path without the Inspector UI.

For general objects, use `create_prop` with a `PropSpec` designed from the user's prompt. See [the complete prompt-to-model contract](prompt-to-model.md). `npm run demo -- --prop bag` or `--prop staff` exercises creation, validation, and export locally. The robot example below remains supported.

Call `create_model` with this example, replacing `request_id` with a fresh UUID for each new intentional operation:

```json
{
  "request_id": "08aac6e5-f3a1-4b42-a085-0de8a5064d8b",
  "spec": {
    "name": "atlas_robot",
    "namespace": "voxelflow",
    "template": "robot",
    "height": 40,
    "build": "slender",
    "detail": "detailed",
    "palette": { "primary": "#2878c8", "secondary": "#e7ad42", "eyes": "#6df5ff" },
    "target": "bedrock",
    "animations": { "clips": ["idle", "walk", "attack"], "speed": 1, "intensity": 1 }
  }
}
```

The response is `{ "ok": true, "data": { "id": "...", "state": "pending_approval", "summary": "..." } }`. That acknowledges the proposal, not completion. Approve it in Blockbench, then call `get_operation` with `{ "operation_id": "08aac6e5-f3a1-4b42-a085-0de8a5064d8b" }`. Require `state: "applied"` before reporting success.

Next call `preview_animation` with `{ "clip": "walk", "playing": true }`, `validate_asset` with `{}`, then `export_asset` with a new `request_id` and `target: "bedrock"`. Approve export and complete the native Save dialog; poll its operation again. A cancelled save returns `cancelled`.

## Codex CLI / Codex MCP configuration

Use an absolute path to your checkout:

```powershell
codex mcp add voxelflow -- node "C:/path/to/VoxelBuild/packages/mcp-server/dist/server.js"
codex mcp list
```

Equivalent configuration in your Codex MCP settings:

```toml
[mcp_servers.voxelflow]
command = "node"
args = ["C:/path/to/VoxelBuild/packages/mcp-server/dist/server.js"]
tool_timeout_sec = 30
```

Do not use both methods to add duplicate servers. Start a new chat or reload MCP connections after configuration. If Node is not on the host's PATH, use the full path to `node.exe` for `command`. Keep the bridge running and the editor connected.

Suggested prompt:

> Use VoxelFlow Studio. Inspect editor status, then create an animated Minecraft robot: tall, slender, blue armor, gold trim, cyan eyes, and idle, walk, and powerful punch animations. Present the structured plan, submit it once, and wait for my approval in Blockbench. Preview walk and punch. Validate the live scene and prepare a Bedrock resource asset export. Only report completion when the operation is applied.

The server exposes `create_minecraft_asset` and `create_animated_robot` prompts, each with a `brief` argument. The general prompt guides the assistant to design named materials and cube parts for the requested object. If an assistant retries after a timeout, it must reuse the original ID and exact parameters, or inspect that ID with `get_operation`. Do not generate another model merely because approval is pending.

Current setup syntax is documented in [OpenAI's Codex MCP guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). This repository's stdio transport and schemas were tested using the official SDK, including a live editor workflow. Registration in a user's Codex installation and an autonomous natural-language run are not included in the recorded test results.

## ChatGPT: permissions and Secure MCP Tunnel

Enter the creative prompt in ChatGPT; use Blockbench for reviewing changes and editing the result. An embedded ChatGPT UI is optional for a tool-based plugin according to the official [plugin quickstart](https://developers.openai.com/plugins/build/app-quickstart). VoxelFlow currently supplies the tools and desktop workspace. After upgrading from 0.1, refresh the host's tool discovery to expose `create_prop` and `apply_prop_materials`.

ChatGPT cannot use the raw `ws://127.0.0.1:32123` editor bridge as an MCP endpoint. This project ships stdio MCP. The current official [Secure MCP Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) supports forwarding a local stdio MCP command without opening an inbound public port.

No ChatGPT tunnel, developer-mode entitlement, or workspace app permission was available for verification in this build session. A successful SDK connection does not establish ChatGPT account access. Treat this path as documented setup pending account-level testing.

To use it, an authorized workspace administrator must first establish the tunnel and grant the required access in OpenAI's current tunnel/app controls. The documented permissions distinguish **Manage** (administration) from **Read + Use** (use of the tunnel). Availability is controlled by your account and workspace. Obtain the official `tunnel-client` binary through the guide or Platform tunnel settings and follow its current authentication flow. Control-plane credentials may be required; these are separate from any model-generation API usage.

On the same machine as Blockbench, with the bridge already connected, use a named local-stdio profile. This PowerShell example assumes the checkout is at `C:/VoxelBuild`; substitute your real path and tunnel ID. If a path contains spaces, ensure the nested command quoting is accepted by `tunnel-client help quickstart`.

```powershell
tunnel-client init --sample sample_mcp_stdio_local --profile voxelflow --tunnel-id tunnel_YOUR_ID --mcp-command "node C:/VoxelBuild/packages/mcp-server/dist/server.js"
tunnel-client doctor --profile voxelflow --explain
tunnel-client run --profile voxelflow
```

Configure the ChatGPT app to use that authorized tunnel according to the official guide, keeping the client running during discovery and use. Verify tool discovery, status, one approval/cancellation, and one applied creation before demonstrating it. If your account does not expose these controls, use the local Codex or Inspector path. Do not port-forward the editor WebSocket or replace its token checks to make it reachable.

For an HTTPS deployment, a separately designed authenticated Streamable HTTP MCP adapter would be needed; one is not shipped. See the official [MCP server guide](https://developers.openai.com/api/docs/guides/custom-mcp-server) and [app connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Tool contract

| Tool | Input beyond request ID | Effect |
| --- | --- | --- |
| `get_editor_status` | none; no request ID | Connection/project/version/format |
| `inspect_project` | none; no request ID | Live counts, hierarchy, mapping, clips |
| `create_model` | `spec` | Proposes a new robot tab with rig/texture/clips |
| `create_prop` | general prop `spec` | Proposes any supported cube-based static object in a new tab |
| `apply_prop_materials` | named `materials` | Recolors existing prop materials while preserving painted pixels |
| `apply_materials` | `palette` | Proposes atlas recoloring |
| `generate_rig` | optional complete `mapping` | Proposes existing bone-role mapping |
| `generate_animations` | `options` | Proposes native clip replacement |
| `validate_asset` | none; no request ID | Live deterministic report |
| `export_asset` | `target: "bedrock"` | Proposes checked ZIP and native Save dialog |
| `undo_last_change` | none | Proposes native undo of latest VoxelFlow edit |
| `get_operation` | `operation_id`; no request ID | Reads status |
| `cancel_operation` | `operation_id`; no request ID | Cancels pending proposal |
| `preview_animation` | `clip`, optional `playing`; no request ID | Changes timeline preview only |

All eight scene/export mutation tools require a UUID `request_id`. Unknown fields, unsupported commands, out-of-range numbers, script strings, paths, and invalid identifiers are rejected by strict schemas. Responses carry `ok`, `data`, or `error` in both structured content and JSON text. Operational failures also set MCP `isError`.

States are `pending_approval → applying → applied/failed/cancelled`, with `rejected` or `cancelled` available before application. Approval is valid for five minutes and tied to the exact project/Undo state. Idempotency/history are in memory for one plugin session, with a maximum of 256 operations. Reloading the plugin resets this ledger; inspect the model before issuing a new command after reload.
