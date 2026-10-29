# VoxelFlow desktop data handling

This describes the 0.3 desktop implementation; it is not a hosted-service privacy policy.

- Structured modeling parameters pass through MCP and a local authenticated loopback bridge to Blockbench.
- The assistant can inspect active geometry, names, materials, texture metadata, animation summaries, validation findings, and recent operation results. Export results may contain the user's selected save path. The chat host's own data handling applies.
- The companion writes a per-user connection file with a local port and token. Desktop logs omit the token. Normal shutdown removes its matching file; restarting replaces a stale file and rotates the token. Do not share the file.
- VoxelFlow includes no analytics, remote model API, or model-upload service. Source/export files are saved locally through Blockbench. This does not describe services supplied independently by Blockbench or the chat host.
- Operation history is bounded and kept in memory for the current plugin session. Removing the plugin does not delete models or exports.
