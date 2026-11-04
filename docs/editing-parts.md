# Edit individual parts through chat

Available in the 0.3.5 build. Update both the desktop companion/chat plugin and the Blockbench plugin, reconnect, and start a fresh chat so `edit_parts` is available. The previous 0.3.4 download does not include this tool.

Open your model in Blockbench, then ask:

- “Make only the front pocket two pixels wider; keep its center fixed.”
- “Move both handles up by two pixels.”
- “Rotate the crystal 15 degrees around Y, keeping its current pivot.”
- “Assign the existing brass material to only the buckle.”

The assistant reads the current project, identifies the named cubes, and proposes just those changes. Review the exact part names and changes in Blockbench, then approve. The same project tab and cube objects remain in use. One native Undo restores the entire batch. The assistant must wait for `get_operation` to report `applied` before claiming success.

## Tool contract

First call `inspect_project` with `{"detail":"full"}`. Use the returned `project.id` as `project_id` and each intended `geometry.parts[].id` as `part_id`. Names are labels, not unique identifiers; ask the artist if several parts could match. Use one fresh UUID `request_id` for an intentional operation, and reuse it with identical arguments only when retrying.

`edit_parts` accepts 1–128 distinct cube edits:

| Field | Meaning |
| --- | --- |
| `part_id` | Exact cube UUID from inspection |
| `move` | `[x,y,z]` delta for both corners and the cube pivot |
| `from`, `to` | Absolute new corners; supply both. The pivot stays unchanged unless specified |
| `rotation` | Absolute `[x,y,z]` rotation in degrees; calculate relative requests from inspected rotation |
| `pivot` | Absolute cube pivot, without moving its bounds; this does not move a bone pivot |
| `material` | Existing named material from a VoxelFlow prop atlas, applied only to this cube |

Omit unchanged fields. Do not combine `move` with `from`, `to`, or `pivot`. Coordinates/pivots must stay within −128…128, dimensions must be positive, and rotation must stay within −180…180. Coordinates follow Blockbench's stored cube coordinates and parent hierarchy, not camera/screen directions. To move an assembly, include all of its intended cubes in the same batch; group/bone transforms remain unchanged.

Geometry-only edits keep per-face UVs and texture pixels. Resizing a box-UV cube is refused because its UV mapping is derived from its size; convert a copy to per-face UVs in Blockbench first. Moving or rotating a box-UV cube is supported.

Assigning a material deliberately replaces visible textured-face UVs with that material's atlas slot. Existing paint pixels are preserved, but painted details may stop appearing on those faces. Disabled faces stay disabled. Material assignment requires the original 128×16 VoxelFlow prop atlas and per-face UVs. Use `apply_prop_materials` to change a named color everywhere it is used instead.

## Safeguards and limits

- Bedrock Entity cube projects only, including existing prop and humanoid cubes. No mesh, bone, add/delete, or reparent operations.
- Locked projects, cubes, or parents are refused. Native mirror modeling is disabled for the transaction so other cubes are not implicitly changed.
- All edits are validated before mutation. An invalid target cancels the entire batch; native edit errors roll it back.
- Approval is bound to the current project snapshot and expires after five minutes. After an artist edit, tab switch, plugin reload, or stale request, inspect again and propose a fresh operation.
- Retry identity lasts for the current editor session. Do not retry an old request after reloading the plugin without inspecting first.
- Existing geometry, textures, bones, animation clips, and other tabs are not recreated. Changes can still affect visual fit or animation appearance; inspect and validate the result before export.
- VoxelFlow's normal inspection limits apply: 512 elements, 128 bones, 8 textures, 32 clips, and 12,000 keyframes, plus snapshot/texture size limits.

If the chat cannot discover `edit_parts`, update both components and refresh the local host connection. A cloud-only chat cannot access the local companion by itself.
