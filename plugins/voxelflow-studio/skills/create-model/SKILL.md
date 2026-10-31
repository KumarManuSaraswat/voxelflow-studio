---
name: create-model
description: Create or recolor Minecraft-style props and animated robots in a connected Blockbench editor using VoxelFlow tools.
---

The user's chat prompt is the design brief. Check `get_editor_status`, then use `create_prop` for general objects and `create_model` only for the animated robot preset. For a disconnected editor, use the setup instructions in [../setup/SKILL.md](../setup/SKILL.md).

Design recognizable silhouettes and the requested details with named parts and materials. Props accept 1–128 cubes, 1–16 colors, and at most 32 groups; coordinates and pivots are −128 to 128 pixels, Y is up, front is negative Z, and each cube must have positive dimensions. Use the tool schema as the source of truth. Bags and staffs are examples, not a category whitelist.

Save tokens without simplifying the requested design: use `repeat: {count, step: [x,y,z]}` on a part for evenly spaced copies. Count includes the original; subsequent names are `name_2`, `name_3`, etc. Explicit pivots translate with each copy; group, material and rotation stay the same. The 128-cube limit applies after expansion. Omit default namespace, root group and zero rotation when appropriate. Keep the plan brief and do not echo the tool JSON in chat. `inspect_project` defaults to a compact summary that includes actual material names and warnings; request `detail: "full"` only when coordinates, pivots, UVs or bone transforms are needed.

Creation opens a new tab. Present the design and submit one UUID request. Ask the artist to review the native Blockbench dialog; `pending_approval` is not completion. Read `get_operation` after approval. Retry only with the same ID and arguments. If the scene changes or the plugin reloads, inspect it before creating another request. Respect the user's requested scope; don't export unless requested.

After creation, inspect and validate the actual project. Read material names before `apply_prop_materials`. This preserves painted pixels and geometry. Structural revisions currently create a new copy; individual parts remain editable in Blockbench. Explain unsupported requests instead of inventing tools.

Outputs are editable resource assets. Inventory items, wearable bags, working weapons, emissive shaders, and arbitrary animated creature rigs are not implemented. Static prop exports omit humanoid animation requirements. Robot presets support idle, walk, and attack. Minecraft runtime is unverified.
