# Install VoxelFlow Studio desktop beta

Requires Node.js 22+, Blockbench desktop 5.2+, and a ChatGPT/Codex desktop host with local plugin execution. Windows is tested; macOS/Linux are not yet verified. There is no npm install or build step for this package. A cloud-only chat cannot directly use this local server.

1. Extract the **desktop-beta ZIP** completely into a folder you will keep.
2. In Blockbench, use **File → Plugins → Load Plugin from File**, select `plugins/voxelflow-studio/blockbench/voxelflow_studio.js`, and review the native plugin trust prompt.
3. Double-click `plugins/voxelflow-studio/Start VoxelFlow.cmd`. Keep its window open. On other systems, run `node plugins/voxelflow-studio/server/bridge-cli.mjs --desktop` from the extracted folder.
4. In Blockbench, open **Tools → VoxelFlow Studio → Connect**. The local connection should be filled automatically; click **Connect**.
5. Open the extracted folder as a local project in your supported desktop host. Restart/refresh the host, find **VoxelFlow Studio** under the **VoxelFlow desktop beta** local plugin source, and install it. Local plugins may be restricted by your workspace administrator.
6. Start a fresh local chat, invoke **VoxelFlow Studio**, and ask: “Create a leather backpack with gold buckles and a front pocket.” Approve the proposed model in Blockbench.

For Codex CLI, the equivalent installation from the extracted folder is:

```text
codex plugin marketplace add .
codex plugin add voxelflow-studio@voxelflow-desktop-beta
```

The separate **plugin ZIP** has `plugin.json` at its root and is intended for plugin import/submission tooling. The desktop-beta ZIP also includes the local marketplace catalog. GitHub hosting does not publish the plugin to ChatGPT's public directory.

If automatic pairing isn't found, ensure the companion and Blockbench run as the same OS user, restart the companion, then reopen Connect. Don't share `.voxelflow-studio/bridge.json`; it contains a local session credential. Restarting rotates that credential. Advanced users can enter a different local port and token in the dialog.

To stop: close the companion window or press Ctrl+C, then disable/remove VoxelFlow in the host and Blockbench if desired. Models and exported files are retained. You can remove the extracted download after uninstalling. A stale connection file is replaced next time the companion starts.
