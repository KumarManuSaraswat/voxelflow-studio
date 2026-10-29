---
name: setup
description: Set up or troubleshoot the VoxelFlow desktop companion and its connection to Blockbench.
---

VoxelFlow requires a local desktop chat, Node.js 22+, and Blockbench desktop 5.2+. It cannot control the user's editor from a cloud-only chat.

Call the bundled `get_editor_status` tool first. If connected, report the active project and continue the user's modeling request. If unavailable, guide the user through [the install guide](../../INSTALL.md): load `blockbench/voxelflow_studio.js` in Blockbench, start `Start VoxelFlow.cmd` on Windows (or `node server/bridge-cli.mjs --desktop`), then choose VoxelFlow → Connect in Blockbench. Keep the companion running. The dialog reads the connection from the user's `.voxelflow-studio/bridge.json`; don't ask the user to paste that file or its token into chat.

If the port is already in use, reuse the existing companion or stop that instance before restarting. Do not terminate unrelated processes. After restart, reconnect Blockbench and check status again. A failed connection is not successful setup. Explain when the host must restart or refresh plugin discovery.
