# Hackathon presenter guide

VoxelFlow Studio 0.3.2 desktop beta · Windows / Blockbench 5.2.2

**Pitch:** VoxelFlow turns a written idea into an editable Minecraft-style model. The assistant designs named cube parts and colors; the artist reviews each change in Blockbench, refines the result, and exports checked resource assets. The project is open source under MIT.

Website: https://voxelflow-studio.vercel.app

Source/contributions: https://github.com/KumarManuSaraswat/voxelflow-studio

## Before leaving home

1. Extract the complete **0.3.2** desktop package. Older versions can hide `create_prop` in Codex because of an incompatible schema. Keep the `.agents` and `plugins` folders together.
2. Have Node.js 22+, Blockbench desktop 5.2+, and your authenticated local AI host installed already. Follow [installation](../plugins/voxelflow-studio/INSTALL.md). Avoid first-time installation during judging.
3. Start `plugins/voxelflow-studio/Start VoxelFlow.cmd`. Reuse it if already running. In Blockbench select Tools → VoxelFlow Studio → Connect. Keep the companion running.
4. Refresh/install VoxelFlow in your host and open a fresh local chat. Confirm **create_prop** is available. Permit the specific modeling tool call when the host asks; Blockbench has a separate native approval. Run the prompt below once beforehand.
5. In a checkout run `npm run doctor`; in the kit double-click **Check Setup.cmd**. All four checks should pass. This proves the connection, not the host's language understanding or approval configuration.
6. Open the website and Blockbench, prepare the prompt, and choose an export folder. Bring your charger, mouse, and an offline kit copy. Close unrelated personal windows before screen sharing.
7. Ask the organizers for the time limit, submission URL/deadline, required video/slides, and judging criteria. These requirements were not supplied and remain unverified.

## Three-minute version

Response time depends on the host/network. Use a saved model openly if the allotted slot cannot accommodate generation.

| Time | Show and say |
| --- | --- |
| 0:00–0:20 | Website. “Game creators have ideas, but building every small prop by hand takes time. VoxelFlow gives them an editable starting point from a prompt.” |
| 0:20–1:10 | Send the lantern prompt. Show the assistant's plan and native approval. Approve once. “The AI designs parts. The artist stays in control.” |
| 1:10–1:40 | Orbit the result and expand named groups. “These are editable cubes and a real PNG atlas.” |
| 1:40–2:15 | Recolor the amber material blue. Approve; optionally Undo. “A color edit preserves the geometry.” |
| 2:15–2:45 | Validate and export. Show passed checks, the engine-unverified warning, and native Save dialog. Save the ZIP. |
| 2:45–3:00 | Show GitHub. “The MIT source is public. Artists, testers, and developers can help improve modeling, onboarding, and game integration.” |

### Create

> Use VoxelFlow Studio. First check the live editor. Create a Minecraft-style brass festival lantern, about 18 pixels tall, with a dark metal base and four corner posts, amber glass panels, a gold top cap, and a square carrying handle. Keep it under 24 editable cubes and group related parts. Use the general prop tool, not the robot preset. Amber is a flat color, not a real light effect. Use lowercase underscore identifiers for all model, material, part, and group names. Explain the design, submit once, and wait for my approval in Blockbench. Only report completion after get_operation says applied.

### Verify after approval

> I approved the creation in Blockbench. Check that operation, inspect the actual model, and validate it. Report the actual part count and warnings. Do not create another copy.

### Refine

> Inspect the current prop's material names. Propose changing only the amber panel material to blue (#4AA8E8), preserving geometry and other colors. Wait for my Blockbench approval, then verify the operation.

### Undo (optional)

> Propose undoing the last VoxelFlow color edit. Wait for approval and verify completion. Do not undo unrelated artist edits.

### Export

> Validate the current model. If there are no failed checks, propose a Bedrock resource asset export. Wait for my approval and the native Save dialog. Only say it succeeded when the operation is applied. Explain the Minecraft runtime warning.

## One-minute version

Say “This is a saved result from our rehearsal.” Spend 10 seconds on the problem, 20 on the editable model and named groups, 15 on approval/validation, and 15 on export contents and the open-source project. Offer live generation afterward.

## Five-minute version

Add the saved Atlas robot's native idle/walk/attack clips. Explain that robot animation is a separate preset; arbitrary generated props are static. Finish with architecture: chat → MCP tools → local companion → native approval → Blockbench → checks/export.

## Recovery

| Problem | Action |
| --- | --- |
| Slow/no internet | Open kit samples or use the offline Bag/Staff examples. Disclose the fallback; new language interpretation requires the AI host. |
| Disconnected | Reuse one running companion, reconnect Blockbench, rerun Check Setup. Never paste session tokens into chat. |
| `create_prop` missing | Refresh/install 0.3.2 and start a fresh local chat before judging. |
| Host approval blocked | Use an interactive chat and approve the specific tool request. Headless sessions with approval policy `never` cannot ask for permission. Do not disable safeguards. |
| Pending | Approve once in Blockbench and check that operation; pending is not success. |
| Stale approval | Inspect the current scene before a fresh proposal. For a timeout, check the original ID first; avoid duplicates. |
| Export warning/cancellation | Explain runtime remains unverified. A cancelled native Save dialog is not successful export. |

## Judge questions

- **What can it build?** Bags, staffs, lanterns, swords, shields, furniture, and other cube-based static objects. Limits: 128 parts, 16 colors, 32 groups. Quality depends on the assistant's design.
- **Only presets?** General props use an assistant-designed geometry specification. Bag/Staff are offline examples. Animated robots use a separate preset.
- **Public ChatGPT plugin?** It is a local MCP plugin. Full ChatGPT account onboarding and public-directory approval remain outstanding. Use the verified local setup and describe the exact host used.
- **Minecraft ready?** Checked Bedrock resource assets and editable source are exported. Item registration, wearable behavior, behavior packs, and runtime testing are separate work.
- **What is distinctive?** Prompt-based geometry in the artist's actual editor, explicit approval, named material edits, Undo, and checks before export. Avoid claiming to be the first or only such tool.
- **Next steps?** Better modeling examples, platform testing, ChatGPT onboarding, and game integration. GitHub Sponsors setup is planned after the hackathon.

## Kit

Run `npm run package:desktop && npm run package:hackathon`. Extract `dist/voxelflow-hackathon-kit-0.3.2.zip` and open **START HERE.html**. It includes the desktop plugin, bundled checker, saved models, resource ZIPs, screenshots, and this guide. Node.js, Blockbench, and AI-host login are installed separately. No account/session credentials are included.
