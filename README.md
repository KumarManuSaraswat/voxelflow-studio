# VoxelFlow Studio

**Version 0.3 desktop beta is installable.** [Download the desktop package](dist/voxelflow-desktop-beta-0.3.0.zip?raw=true) and follow [the install guide](plugins/voxelflow-studio/INSTALL.md). It includes a plugin manifest, two skills, bundled MCP dependencies, the Blockbench plugin, and a Windows companion launcher. Requires Node.js 22+ and Blockbench desktop 5.2+; no npm install/build step is needed for this download.

**GitHub availability is not public ChatGPT-directory publication.** This package installs through a local desktop marketplace and needs a local chat. OpenAI's [desktop-only submission route](https://developers.openai.com/plugins/deploy/desktop-only) currently requires approved-partner access. See [distribution status](docs/distribution.md).

With Codex CLI, install directly from this repository:

```text
codex plugin marketplace add KumarManuSaraswat/voxelflow-studio
codex plugin add voxelflow-studio@voxelflow-desktop-beta
```

Describe a Minecraft-style object in ChatGPT or Codex; VoxelFlow turns the assistant's structured design into an editable Blockbench model. Version 0.2 adds a general cube-based prop builder for bags, staffs, lanterns, swords, and other objects, alongside the animated robot pipeline. Review changes in Blockbench, adjust the parts or texture, and export checked Bedrock resource assets.

![Backpack generated in Blockbench](docs/evidence/adventurer-bag.png)

**Prompt location: ChatGPT. Model workspace: Blockbench.** The assistant composes up to 128 cubes and 16 named materials; objects are not restricted to preset categories. Offline Bag, Staff, and Robot examples also work without an AI account. Every scene change and export presents a review dialog in Blockbench. See [prompt-to-model workflow](docs/prompt-to-model.md).

**Verification:** Windows Blockbench **5.2.2**, Node **24.11.1**; 84 automated tests pass. The extracted 0.3 package runs outside the repository without `node_modules`, exposes 14 MCP tools and 2 prompts, and installs through the local Codex plugin manager. Actual MCP calls exercise the installed editor. See [verification evidence](docs/verification.md). Minecraft runtime and an autonomous ChatGPT natural-language session remain unverified.

## Developer quick start

Requirements: Blockbench **desktop 5.2+**, Node **22+**, npm. Use the repository root as your terminal working directory. On Windows, `npm.cmd` also works when PowerShell disallows `npm.ps1`.

```powershell
npm ci
npm run check
```

`check` runs type checking, tests, the plugin/server build, and reproducible example generation. To build only, run `npm run build`. To run only tests, run `npm test`.

1. In Blockbench, open **File → Plugins**, select **Load Plugin from File**, and choose `dist/voxelflow_studio.js` from this project. Review Blockbench's plugin trust prompt. This is a desktop plugin; the web editor is unsupported.
2. Open **Tools → VoxelFlow Studio**. A start-screen dialog or a dockable sidebar shows five stages: Create, Texture, Rig, Animate, Export.
3. Choose **Bag** or **Staff** and review its plan, then **Apply change**. A fresh Bedrock tab contains editable parts and a PNG atlas. Choose **Robot** for height/build/colors and the existing animated character pipeline.
4. Use **Texture** to change named colors or paint directly. Robot projects additionally support Idle, Walk, and Punch previews and speed/strength updates.
5. In **Export**, run quality checks, review the export, approve it, and choose a ZIP destination in the native Save dialog.

The preset path above is fully local. Natural-language interpretation happens in a connected MCP host, not inside an embedded paid AI service.

## Connect an AI assistant

Start the local bridge in a terminal and leave it running:

```powershell
npm run bridge
```

Copy the session token shown in that terminal. In the plugin, click **Connect**, keep port `32123`, paste the token, and connect. The indicator should say the local bridge is connected. By default, tokens rotate whenever the bridge restarts; reconnect the plugin after a restart.

The bridge is separate from the stdio MCP server. Your MCP host launches the server with:

```powershell
node "C:/path/to/VoxelBuild/packages/mcp-server/dist/server.js"
```

Use your actual absolute path. `npm start` starts the same stdio server, but it expects an MCP client on stdin; it is not a web page or interactive console. Prefer the direct `node` command in hosts to keep stdout exclusively MCP protocol traffic.

For a real, account-free end-to-end MCP test, open a second terminal:

```powershell
npm run demo -- --status
npm run demo
npm run demo -- --prop bag
npm run demo -- --prop staff
```

Choose one demo: the default creates an animated robot; `--prop bag` and `--prop staff` create static props. Each validates the live scene and proposes export. **Approve both proposals in Blockbench and choose a save location.** These use the official MCP SDK client against the actual editor.

For Codex CLI:

```powershell
codex mcp add voxelflow -- node "C:/path/to/VoxelBuild/packages/mcp-server/dist/server.js"
codex mcp list
```

Start a new chat after registration. Ask: “Use VoxelFlow to create a brown leather backpack with gold buckles, shoulder straps, and a front pocket. Show the plan, wait for my approval in Blockbench, validate it, then prepare a Bedrock export.”

See [MCP setup](docs/mcp-integration.md) for Inspector, configuration examples, the operation protocol, and ChatGPT Secure MCP Tunnel prerequisites. No ChatGPT app or tunnel was registered automatically.

## What artists can do

| Stage | Implemented behavior |
| --- | --- |
| Create | General static props: up to 128 cubes, 16 colors, 32 groups, rotations/pivots; Bag/Staff examples; animated Atlas robot with height/build/detail controls |
| Texture | Real PNG atlas (props 128×16, robot 64×16), per-face UVs, named recoloring preserving painted pixels, native Paint mode |
| Rig | Root, torso, head, shoulders/elbows, hips/knees; conservative bone-name detection and manual mapping of existing humanoids |
| Animate | Editable native idle, walk, attack; preview; speed 0.25–3×; strength 0.1–1.5×; loop checks |
| Export | Live quality report; Bedrock geometry, PNG, clips, controllers, client entity, manifest, source `.bbmodel`; native Save dialog |
| Recovery | Review/cancel, native Undo, recent creative history, retry deduplication, stale-proposal rejection |

Open an existing `.bbmodel` through **File → Open Model**, then use Rig → **Map body parts**. It must already have separate upper/lower limbs in a usable hierarchy and a Bedrock-compatible format. Mapping does not invent joints or reposition imported geometry. Uncertain or invalid mappings stop animation generation with a correction.

Left/right means the character's own left/right; front faces negative Z in the editor. Bright eye pixels are not an emissive material. Palette recoloring applies only to VoxelFlow textures carrying palette metadata; a pixel painted to exactly its old generated value is indistinguishable from an untouched pixel.

## Output files

| Deliverable | Location |
| --- | --- |
| Installable standalone plugin | [`dist/voxelflow_studio.js`](dist/voxelflow_studio.js) |
| Built MCP server | [`packages/mcp-server/dist/server.js`](packages/mcp-server/dist/server.js) |
| Complete source/build archive | [`dist/voxelflow-studio-0.3.0.zip`](dist/voxelflow-studio-0.3.0.zip) |
| Installable desktop beta (recommended) | [`dist/voxelflow-desktop-beta-0.3.0.zip`](dist/voxelflow-desktop-beta-0.3.0.zip) |
| Portable plugin ZIP | [`dist/voxelflow-plugin-0.3.0.zip`](dist/voxelflow-plugin-0.3.0.zip) |
| Editable bag and staff samples | [`examples/props/`](examples/props/) |
| Bag resource assets | [`dist/adventurer_bag_bedrock_assets.zip`](dist/adventurer_bag_bedrock_assets.zip) |
| Bag exported from the actual editor, with native source | [`dist/adventurer_bag_live_bedrock_assets.zip`](dist/adventurer_bag_live_bedrock_assets.zip) |
| Staff resource assets | [`dist/arcane_staff_bedrock_assets.zip`](dist/arcane_staff_bedrock_assets.zip) |
| Real live-editor export, including native source | [`dist/atlas_robot_live_bedrock_assets.zip`](dist/atlas_robot_live_bedrock_assets.zip) |
| Editable sample created in Blockbench | [`examples/robot/atlas_robot.bbmodel`](examples/robot/atlas_robot.bbmodel) |
| Reproducible pure-core sample ZIP | [`dist/atlas_robot_bedrock_assets.zip`](dist/atlas_robot_bedrock_assets.zip) |
| Unpacked reproducible resource files | [`examples/exported-bedrock/`](examples/exported-bedrock/) |
| Specification, clips, actual validator output | [`examples/robot/`](examples/robot/) |
| Checksums | [`dist/SHA256SUMS.txt`](dist/SHA256SUMS.txt) |

The pure-core sample has nine files; live export adds a tenth file, the native source. `npm run examples` regenerates the pure sample; it intentionally leaves the captured live export and source intact. `npm run verify:live-export` checks the captured ZIP and extracts its native source. `npm run package` creates and verifies the release ZIP after a build. The release includes source and builds; run `npm ci` after extraction for the Node companion.

`npm run examples:props` generates the prop specifications, textures, reports, and seven-file pure prop ZIPs. Live prop exports add native source as an eighth file. Structural revisions through MCP currently create a new copy; individual cube editing remains available in Blockbench.

The ZIP is a **resource asset package**. A registered inventory item, wearable bag, functioning staff, or playable mob still needs the corresponding item/attachable or behavior configuration and in-game verification. See [Bedrock integration](docs/bedrock-integration.md).

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Plugin panel missing | Confirm desktop 5.2+, load the built JS, then Tools → VoxelFlow Studio. If docked below other panels, drag its title to the top or use its panel menu to reset the layout. |
| MCP says disconnected | Start `npm run bridge`; connect the plugin with the current token. The Node server alone does not connect Blockbench. |
| Token rejected | Copy the current bridge token, not a previous session token. Check the same port in both places. |
| Port already in use | Stop your previous bridge with Ctrl+C, or start with `$env:VOXELFLOW_PORT='32124'; npm run bridge` and choose that port in the plugin. |
| Stuck at pending approval | Switch to Blockbench and review the proposal. Only `applied` means success. `get_operation` reports the current state. |
| Project changed / proposal expired | Inspect the scene and submit a new request ID. Do not retry with changed arguments under an old ID. Approvals expire after five minutes. |
| Rig or animation check fails | Map all 11 existing bones; repair hierarchy/joints; use finite numeric linear/step keyframes. Unsupported features are reported, not discarded silently. |
| UV/texture failure | Restore a real PNG, assign every visible face, and bring UV coordinates inside the texture. Palette recoloring requires the generated atlas metadata. |
| Undo refuses | Another artist edit followed the VoxelFlow edit, or the project/session changed. Use Blockbench's ordinary Undo history deliberately. |
| Export did not save | Check the operation status. Cancelling the native Save dialog returns `cancelled`, not success. |
| Server exits / host finds no tools | Run `npm ci` and `npm run build`; use the absolute built server path and Node 22+. Inspect stderr in the MCP host. |
| Tests cannot bind localhost | Run in a local environment allowing loopback sockets; bridge integration tests need real local ports. |

For developer details, see [architecture and safety](docs/architecture.md), [manual smoke checklist](docs/manual-smoke-test.md), [roadmap](docs/roadmap.md), and the [90-second demo](docs/demo.md).

## Dependencies and license

The desktop package bundles its JavaScript runtime dependencies with complete [license notices](plugins/voxelflow-studio/THIRD_PARTY_NOTICES.txt). `npm run package:desktop` rebuilds both desktop ZIPs; `npm run verify:desktop` tests a fresh extraction. Checksums are in `dist/DESKTOP-SHA256SUMS.txt`.

Original project code is MIT licensed. Bundled dependency notices are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). Build tooling uses the official `blockbench-types`; the plugin uses Blockbench's installed editor APIs. `npm audit --omit=dev` reported zero advisories on 2026-10-29. The full development tree has two low-severity advisories through Vue 2 in the official type package; it is not bundled into the plugin or companion runtime.
