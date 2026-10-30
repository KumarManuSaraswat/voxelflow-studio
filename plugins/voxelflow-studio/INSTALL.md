# Install VoxelFlow Studio desktop beta

Requires Node.js 22+, Blockbench desktop 5.2+, and a ChatGPT/Codex desktop host with local plugin execution. Windows is tested; macOS/Linux are not yet verified. There is no npm install or build step for this package. A cloud-only chat cannot directly use this local server.

1. Extract the **desktop-beta ZIP** completely into a folder you will keep.
2. In Blockbench, use **File → Plugins → Load Plugin from File**, select `plugins/voxelflow-studio/blockbench/voxelflow_studio.js`, and review the native plugin trust prompt.
3. Double-click `plugins/voxelflow-studio/Start VoxelFlow.cmd`. Keep its window open. On other systems, run `node plugins/voxelflow-studio/server/bridge-cli.mjs --desktop` from the extracted folder.
4. In Blockbench, open **Tools → VoxelFlow Studio → Connect**. The local connection should be filled automatically; click **Connect**.
5. Open the extracted folder as a local project in your supported desktop host. Restart/refresh the host, find **VoxelFlow Studio** under the **VoxelFlow desktop beta** local plugin source, and install it. Local plugins may be restricted by your workspace administrator.
6. Start a fresh **local** chat with VoxelFlow enabled. First ask: “Use get_editor_status to check my Blockbench connection.” Only continue when the tool reports connected. Then try a [model prompt](PROMPTS.md) and approve the proposed model in Blockbench.

The desktop-beta ZIP also puts **Start VoxelFlow.cmd** and **Check VoxelFlow.cmd** next to **START-HERE.md**, so you can launch from the extracted folder. The separate plugin ZIP keeps these files at its own root.

## If setup gets stuck

Run **Check VoxelFlow.cmd** (Windows), or `node server/doctor.mjs` from the plugin folder. No npm install is needed. It performs read-only Node, package, MCP discovery, and editor checks. You can add `--json` for a structured report.

| What you see | Next action |
| --- | --- |
| VoxelFlow absent in Blockbench | Load `blockbench/voxelflow_studio.js` through File > Plugins > Load Plugin from File. Open Tools > VoxelFlow Studio. |
| Package check fails | Extract the whole ZIP; do not run inside the archive or move only the launcher. |
| MCP discovery fails | Check Node.js 22+, re-extract the package, and check whether security software blocked the child process. |
| Live Blockbench fails | Keep the companion running and connect from the Blockbench panel. |
| All checks pass, but chat says tools unavailable | The local editor is ready, but that chat lacks local tool access. Enable VoxelFlow in a compatible local desktop chat and start a fresh chat. Reinstalling Blockbench does not fix a cloud-only chat. |
| Pending approval | Review the proposal in Blockbench. The assistant must check the operation result after approval. |

A passing diagnostic cannot verify the AI host's permissions. A plugin mention or a project called VoxelBuild does not prove the chat runs locally. Codex's local workflow is verified; ChatGPT support depends on the account, host, and local execution availability. This package is not a hosted MCP endpoint for browser-only chat.

For Codex CLI, the equivalent installation from the extracted folder is:

```text
codex plugin marketplace add .
codex plugin add voxelflow-studio@voxelflow-desktop-beta
```

The separate **plugin ZIP** has `plugin.json` at its root and is intended for plugin import/submission tooling. The desktop-beta ZIP also includes the local marketplace catalog. GitHub hosting does not publish the plugin to ChatGPT's public directory.

If automatic pairing isn't found, ensure the companion and Blockbench run as the same OS user, restart the companion, then reopen Connect. Don't share `.voxelflow-studio/bridge.json`; it contains a local session credential. Restarting rotates that credential. Advanced users can enter a different local port and token in the dialog.

To stop: close the companion window or press Ctrl+C, then disable/remove VoxelFlow in the host and Blockbench if desired. Models and exported files are retained. You can remove the extracted download after uninstalling. A stale connection file is replaced next time the companion starts.
