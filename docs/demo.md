# 90-second hackathon demo

## Before the timer

Run `npm ci`, `npm run build`, and `npm run bridge`. Install the built plugin, connect its token, and configure your MCP host using [the setup guide](mcp-integration.md). Confirm `get_editor_status` returns `connected: true`. Arrange Blockbench beside the chat, keep VoxelFlow at the top of the sidebar, and choose a convenient export folder. Rehearse host latency; the schedule assumes the assistant responds promptly.

If an AI host account is unavailable, run `npm run demo` as the disclosed official-SDK MCP demonstration. It uses the same real tool/approval/editor path, but does not demonstrate natural-language interpretation. The plugin's preset interface also works offline.

## Live sequence

| Time | Action and narration |
| --- | --- |
| 0–10 s | Show Blockbench and the connected indicator. “VoxelFlow turns an artist's brief into editable game assets, with approval at each change.” |
| 10–25 s | Send the prompt below. Show the structured plan and the native review dialog. Click Apply change. |
| 25–40 s | Orbit the robot. Expand the Outliner to show elbows and knees. “These are real cubes, a PNG texture, and an articulated hierarchy.” |
| 40–55 s | Animate → Idle, then Walk, then Punch. Show the native timeline keyframes. “Breathing, alternating gait, and a punch with windup and recovery.” |
| 55–65 s | Set Speed to 1.5, review and approve the animation update. “Timing changes without rebuilding the robot.” |
| 65–77 s | Export → Run quality checks. Show Passed / Warning / Failed. Explain the explicit engine-testing warning. |
| 77–88 s | Review Bedrock export, approve, and save the ZIP. Show geometry, texture, animations, controllers, and editable source. |
| 88–90 s | “Creative control stays with the artist. The next milestone is behavior-pack integration and in-game testing.” |

Prompt:

> Use VoxelFlow Studio to create a 40-pixel slender Minecraft robot with blue armor, gold trim, cyan eyes, and idle, walk, and powerful punch animations. First check the live editor and present the plan. Submit creation once, then wait for my approval in Blockbench and check the operation result. Preview walk and punch. Validate the asset and prepare a Bedrock export when I ask. Explain any unsupported request clearly.

For the final export, ask “Validate the current model, then propose the Bedrock export.” Approval and the Save dialog remain in Blockbench. A tool response saying `pending_approval` is not a completed result.

## Be precise on stage

Working: editable geometry/PNG/native animations, human review, Undo, live MCP tools, deterministic quality checks, a saved resource asset ZIP, speed and palette changes without recreating geometry.

Not demonstrated as complete: arbitrary creature generation, AI image synthesis, automatic rigging of arbitrary meshes, true emissive eyes, a behavior pack/playable mob, Minecraft runtime compatibility, or a ChatGPT account connection unless you have separately configured and tested it.

Recovery: if approval reports a changed scene, submit a fresh plan after inspecting it. If disconnected, reconnect with the current bridge token. The native sample `examples/robot/atlas_robot.bbmodel` and captured ZIP are available for showing saved results, but disclose that they are prerecorded artifacts if used as fallback.
