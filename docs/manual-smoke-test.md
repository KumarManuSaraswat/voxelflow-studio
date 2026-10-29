# Manual Blockbench smoke test

Use an isolated test project. Install `dist/voxelflow_studio.js` in Blockbench desktop 5.2+, and start a fresh bridge. These are reproducible checks; the actual completed subset is recorded in [verification.md](verification.md).

- [ ] Load plugin through File → Plugins → Load Plugin from File. Confirm Tools → VoxelFlow Studio and five stages. Unload/reload without duplicate panels or listeners.
- [ ] Without a connection, create a preset, review its summary, and cancel. Confirm no tab or geometry was created.
- [ ] Create Bag (28 cubes, 8 groups) and Staff (16 cubes, 6 groups), each with a 128×16 atlas. Check pocket/straps/buckles and staff crown/grip. Quality checks must not require humanoid roles or clips.
- [ ] Submit a newly designed object through `create_prop` with named materials and cube parts. Confirm it does not require a preset category. Invalid dimensions/material references must fail before approval.
- [ ] Use `apply_prop_materials` to change one named color. Check geometry remains, painted pixels survive, and native Undo restores the texture and palette. Save/reopen `.bbmodel` and confirm prop metadata persists.
- [ ] Export a prop: eight live files, including native source, with no dangling animation/controller references. Item/attachable gameplay setup remains separate.
- [ ] Create a tall slender detailed robot and approve. Confirm a new tab, 43 cubes, 11 bones, one 64×16 texture, three native clips, and all prior tabs preserved.
- [ ] Open Paint mode, paint a distinctive pixel, then recolor through Texture. Confirm that pixel survives and unpainted swatches change. Native Undo should restore the previous atlas and metadata.
- [ ] Inspect root → torso → head/arms and root → upper legs → lower legs. Rotate an elbow and knee with native controls, then Undo. Geometry should rotate around the joint without detaching.
- [ ] Preview idle and walk for two loops. Watch for seams, opposing limbs, and torso motion. Preview attack through windup, strike, recovery, and stop.
- [ ] Set speed 1.5 and strength 1.2, approve. Confirm three clips change, while cube UUIDs/positions and texture remain. Undo should restore original timings/keyframes.
- [ ] Open the native sample with File → Open Model. Confirm texture, hierarchy, native clips, and VoxelFlow mapping are retained. Try mapping an existing compatible humanoid; ambiguous names should need manual mapping.
- [ ] Start `npm run bridge`, paste its token, and verify connected status through `npm run demo -- --status` or Inspector.
- [ ] In Inspector, submit `create_model`. Before approval, confirm no creation. Approve, poll `get_operation`, and require `applied`.
- [ ] Retry the exact request ID/arguments. Confirm the same operation and no duplicate model. Change a parameter under that ID and require an error.
- [ ] Propose a palette change, make a native edit before approval, then approve. Require a stale-proposal error and no palette mutation. Submit a fresh request to continue.
- [ ] Reject a proposal and cancel another with `cancel_operation`. Confirm no scene changes. Disconnect the bridge during a pending remote proposal; it must become cancelled.
- [ ] Run quality checks; inspect the actual findings. Temporarily remove a required bone/clip or a face texture assignment, require a failure, then Undo and validate again.
- [ ] Export a passing project. Approve and cancel the native Save dialog: operation must be cancelled. Repeat with a fresh ID, save ZIP, require `applied` and `saved: true`.
- [ ] Inspect all ten live-export files and references, open the included `.bbmodel`, and compare counts/keyframes. Run `npm run verify:live-export` against the delivered captured sample.
- [ ] Disconnect Blockbench and call `get_editor_status`: require `connected: false`; a modifying tool must report unavailability, not success.
- [ ] Verify in Minecraft separately with a matching behavior entity and content logs before making any engine-compatibility claim.

Host-specific checks: use the [Codex/Inspector/ChatGPT instructions](mcp-integration.md). A real SDK integration test is not a substitute for verifying permissions in a particular user's ChatGPT workspace.
