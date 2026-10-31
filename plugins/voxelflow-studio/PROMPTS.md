# Your first models

Use these briefs in a local desktop chat with VoxelFlow's tools enabled. They are starting points, not guaranteed outputs. First ask: "Use get_editor_status to check my Blockbench connection." Then try one prompt and approve the proposed change in Blockbench.

| Idea | Prompt |
| --- | --- |
| White bag | Create a white canvas bag with two handles, a front pocket, dark stitching accents, and silver buckles. Use named parts and materials. Keep it under 40 cubes. |
| Wizard staff | Create a wooden wizard staff with a violet crystal, gold collar, and leather grip. Make it a static prop, with a clear silhouette and no more than 30 cubes. |
| Lantern | Create a brass festival lantern with a square base, amber center, dark frame, and hanging handle. Use warm colors; no emissive shader is required. |
| Treasure chest | Create a small closed treasure chest with dark wood panels, metal bands, and a gold latch. Group the lid, body, and fittings separately. |
| Furniture | Create a compact oak writing desk with four legs, a drawer, and an ink bottle. Make the parts easy to select in Blockbench. |
| Robot | Create a short, heavy robot with blue armor and orange trim. Include the supported idle, walk, and attack presets. |

## Refine the result

1. "Inspect the current model and list its material names."
2. "Change only the bag's canvas material to pale blue. Preserve the painted pixels and geometry." Use the actual name returned by inspection.
3. "Validate the current model and explain any failures or warnings."
4. "Export the Bedrock resource assets." Review approval and complete the Save dialog.

Geometry changes through chat currently create a new model tab. For precise in-place part edits, use Blockbench. Ask explicitly for a new variant if you want the assistant to rebuild a design.

## Share an example

Include your prompt, VoxelFlow/Blockbench versions, an image, an editable `.bbmodel`, and anything you changed by hand. Share only your own or appropriately licensed work. A generated model is not automatically a registered Minecraft item, wearable, or playable mob; those require game integration and testing.

## Lower-token modeling

For evenly spaced details, ask: “Use repeated parts and concise inspection while keeping all requested details.” In 0.3.4, the assistant can supply one cube with a repeat count and step; VoxelFlow expands it into editable copies locally. Routine inspection is concise by default. Full coordinates remain available when needed. Actual token savings depend on the design and chat host.
