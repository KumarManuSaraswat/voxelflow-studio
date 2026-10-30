# Getting help

Start with the [installation guide](plugins/voxelflow-studio/INSTALL.md), [MCP setup](docs/mcp-integration.md), and [distribution status](docs/distribution.md). Support is community-based and has no guaranteed response time.

| Symptom | Check |
| --- | --- |
| Unsure where setup failed | Run Check VoxelFlow.cmd from the extracted desktop ZIP. No npm install is needed. It checks local tools and Blockbench, not chat permissions. |
| Local checks pass, chat tools missing | Use local execution with VoxelFlow enabled in a fresh desktop chat. A plugin mention alone does not connect a cloud chat to your laptop. |
| Plugin missing | Use Blockbench desktop 5.2+, load the built plugin file, then open Tools → VoxelFlow Studio. The web editor is unsupported. |
| Desktop plugin missing in chat | Install the local marketplace source, enable VoxelFlow, and start a fresh local chat. Workspace policies and host support can restrict local plugins. |
| Bridge disconnected | Start the companion and click Connect in Blockbench. Starting the MCP server alone does not connect the editor. |
| Automatic pairing missing | Run the companion and Blockbench as the same OS user. Restart the companion and reopen Connect. |
| Token rejected | Reconnect with the current session credential; restarting the bridge rotates it. Never post the credential. |
| Port in use | Stop an older companion with Ctrl+C, or choose another local port through `VOXELFLOW_PORT` and reconnect. |
| Pending approval | Switch to Blockbench and review the proposal. Only an `applied` result means the change completed. |
| Expired or stale proposal | Inspect the current scene and submit a fresh request ID. Approvals expire after five minutes. |
| Undo refused | Later edits or a project/session change can invalidate a VoxelFlow undo. Inspect Blockbench's native Undo history. |
| Export cancelled | The native Save dialog must complete. Cancelling returns `cancelled`, not a saved file. |

For bugs, [open a bug report](https://github.com/KumarManuSaraswat/voxelflow-studio/issues/new?template=bug_report.yml) with versions, steps, expected behavior, and a small example. Remove secrets and unrelated personal content from logs and screenshots. For feature ideas, use the feature form and describe what an artist needs to accomplish.

Security vulnerabilities belong in the [private reporting process](SECURITY.md). Community conduct concerns follow the [Code of Conduct](CODE_OF_CONDUCT.md).
