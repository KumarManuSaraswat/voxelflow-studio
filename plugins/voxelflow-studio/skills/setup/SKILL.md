---
name: setup
description: Set up or troubleshoot the VoxelFlow desktop companion and its connection to Blockbench.
---

VoxelFlow requires a local desktop chat, Node.js 22+, and Blockbench desktop 5.2+. It cannot control the user's editor from a cloud-only chat.

Discover the bundled `get_editor_status` tool first. Distinguish these cases:

1. **The tool is absent from this chat:** this is host/tool availability, not evidence that Blockbench is disconnected. Check whether this chat has local execution and VoxelFlow enabled. A plugin mention or a project name alone does not grant access to the laptop. Guide the user to a fresh local chat in a compatible desktop host. Do not repeatedly tell them to restart the companion or reinstall Blockbench. Do not claim the problem is fixed until the tool is available and responds.
2. **The tool responds with connected:false:** follow [the install guide](../../INSTALL.md). Load `blockbench/voxelflow_studio.js` in Blockbench, start `Start VoxelFlow.cmd` (or `node server/bridge-cli.mjs --desktop`), then choose VoxelFlow → Connect. Keep the companion running.
3. **The tool responds with connected:true:** report the active project and continue the user's modeling request. Do not repeat installation.

For a local diagnostic, run `Check VoxelFlow.cmd` beside the launcher (or `node server/doctor.mjs`). It requires no npm install. A passing local check does not verify the AI host's tool access. Pairing is read from `.voxelflow-studio/bridge.json`; never ask the user to paste that file or its token into chat.

If the port is already in use, reuse the existing companion or stop that instance before restarting. Do not terminate unrelated processes. After restart, reconnect Blockbench and check status again. A failed connection is not successful setup. Explain when the host must restart or refresh plugin discovery.
