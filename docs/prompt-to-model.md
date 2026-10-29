# Prompt → Minecraft model

VoxelFlow 0.2 puts natural-language prompts in **ChatGPT or Codex**. Blockbench is the live modeling workspace: review the proposed change, see the model, paint or adjust it, and export. A second chatbot inside Blockbench is unnecessary for this architecture. OpenAI's [MCP plugin quickstart](https://developers.openai.com/plugins/build/app-quickstart) describes tools as the integration mechanism and makes an embedded ChatGPT UI optional.

## What happens

1. The artist asks ChatGPT: “Use VoxelFlow to create a brown leather adventurer backpack with gold buckles, shoulder straps, and a front pocket.”
2. ChatGPT checks `get_editor_status`, then designs a `PropSpec`: named materials and cube parts with dimensions, groups, and optional rotation/pivots.
3. `create_prop` validates the complete blueprint and opens a review dialog in Blockbench. It accepts general geometry; it does not match text against a hard-coded list of words or categories.
4. After approval, Blockbench creates a fresh editable project, PNG atlas, UVs, and named part groups. The original project stays open.
5. ChatGPT polls the operation, inspects the real result, and runs quality checks. Export happens only after its own approval and native Save dialog.

Example prompts:

- “Create a leather backpack with a front pocket, two gold buckles, a carry handle, and shoulder straps.”
- “Create a wizard staff with a wooden shaft, wrapped grip, gold fittings, and a large purple crystal.”
- “Make a square iron lantern with a warm orange center and a ring handle.”
- “Build a small oak treasure chest with dark metal bands and a gold lock.”
- “Create a block-style sword with a silver blade, blue grip, and gold crossguard.”

These prompts require the MCP connection described in [MCP setup](mcp-integration.md). The underlying tools work locally; ChatGPT account installation/tunnel access must still be configured and verified. Natural-language design quality depends on the connected model. A valid blueprint is not a guarantee of artistic accuracy.

## The prop contract

`create_prop` accepts a UUID `request_id` and this structure:

```json
{
  "name": "custom_lantern",
  "namespace": "voxelflow",
  "description": "A compact lantern with a wooden base and amber center.",
  "materials": [
    {"name": "wood", "color": "#70452c"},
    {"name": "amber", "color": "#ffb34f"}
  ],
  "parts": [
    {"name": "base", "group": "frame", "from": [-3,0,-3], "to": [3,1,3], "material": "wood"},
    {"name": "light_core", "group": "light", "from": [-2,1,-2], "to": [2,6,2], "material": "amber"}
  ]
}
```

This small JSON demonstrates the contract; a finished lantern should add its frame, cap, and handle. The assistant can compose those details without adding a new preset to the program.

Bounds: 1–128 cubes, 1–16 named colors, at most 32 groups, coordinates/pivots between −128 and 128 pixels, positive dimensions, and rotations between −180° and 180°. Y points up; front is negative Z. Names use lowercase letters, numbers, and underscores. Each material reference must exist. Arbitrary code, filesystem destinations, and extra properties are rejected.

The atlas is a real 128×16 PNG. `apply_prop_materials` changes existing named colors while preserving individually painted pixels. Example: after inspecting the materials, use `materials: [{"name":"leather","color":"#336b52"}]` to make the bag green without rebuilding it. Each change still requires approval and supports native Undo.

Structural revisions currently create a new project copy through another `create_prop` request. Targeted in-place cube editing is not exposed as an MCP tool in this release. Native Blockbench tools can edit every part directly.

## Offline and export

The Create panel has Bag, Staff, and Robot examples. Bag and Staff exercise the same generic prop builder used by ChatGPT; they are not the limits of supported object categories. For an account-free MCP demo:

```powershell
npm run bridge
# Connect the plugin, then in a second terminal:
npm run demo -- --prop bag
# Or:
npm run demo -- --prop staff
```

A static prop needs no humanoid mapping or character clips. Its live export contains eight files: geometry, PNG, static client entity, render controller, manifest, report, integration notes, and native `.bbmodel`. The pure example ZIP omits native source and has seven files. Custom prop animation export is not implemented; use Blockbench's native exporter if adding custom animations.

The resulting object is a Minecraft-style **3D asset**, not yet a registered inventory item, wearable backpack, or functioning staff. Bedrock item/attachable definitions, hand/body transforms, gameplay logic, and engine testing are separate steps. Colored crystals do not produce actual light or emissive rendering.
