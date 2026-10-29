# Create your first model

VoxelFlow connects a supported local AI host to the real Blockbench editor. Start with the [installation guide](../plugins/voxelflow-studio/INSTALL.md), then use this workflow to create and export an editable prop.

## Connect

Start the companion, connect Blockbench, and open a fresh local chat with VoxelFlow installed. Ask the host to check the live editor status. Require `connected: true` and confirm `create_prop` is available. From a developer checkout, `npm run doctor` checks the package, tools, and editor connection.

## Describe a prop

> Use VoxelFlow Studio to create a brown leather adventurer backpack with gold buckles, a front pocket, a handle, and shoulder straps. Use the general prop tool. Explain the design, submit once, and wait for my approval in Blockbench. Check the operation before reporting completion.

Review the proposed geometry and materials in Blockbench, then choose **Apply change**. Ask the assistant to inspect the actual project and validate it. A response saying `pending_approval` acknowledges a proposal; only `applied` confirms completion.

## Refine and save

Ask the assistant to inspect the current material names before requesting a color change. Named material edits preserve geometry and painted pixels. Approve the change in Blockbench. The Undo tool can revert the last VoxelFlow edit and refuses to undo unrelated artist work.

For export, ask: “Validate the current model, then propose a Bedrock resource asset export.” Review the checks, approve export, and choose a destination in the native Save dialog. A cancelled save is not a successful export. The ZIP contains editable source and resource assets; game item registration and runtime testing are separate work.

## Explore examples

Open the saved [bag](../examples/props/bag/adventurer_bag.bbmodel), [staff](../examples/props/staff/arcane_staff.bbmodel), [lantern](../examples/props/lantern/brass_festival_lantern.bbmodel), or [Atlas robot](../examples/robot/atlas_robot.bbmodel) in Blockbench. Bag and Staff examples can also be created offline from the VoxelFlow panel. New natural-language interpretation needs a connected AI host.

The robot is a separate animated preset with idle, walk, and attack clips. General props are static and can contain up to 128 cubes, 16 materials, and 32 groups. Arbitrary creature rigging, real emissive effects, wearable behavior, and gameplay are not implemented.

Developers can exercise the official SDK path with `npm run demo -- --prop bag` or `--prop staff`, following [MCP setup](mcp-integration.md). These commands use structured examples rather than natural-language interpretation. See [verification](verification.md) for tested paths and platform limits.
