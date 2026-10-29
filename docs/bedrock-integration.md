# Bedrock resource asset integration

The live robot ZIP contains ten files: geometry, a PNG, animation definitions, an animation controller, a client entity, a render controller, a resource manifest, the actual validation report, integration notes, and a native Blockbench source file. A static prop ZIP contains eight files, omitting animation definitions and their controller. Neither contains gameplay definitions or a game-tested item/mob.

For bags, staffs, and other props, the export supplies a static entity scaffold. To hold or wear one as an item, add matching item/attachable definitions and hand/body transforms in your Bedrock project. To display it as a world entity, add a behavior entity with the matching identifier. Static props do not need humanoid mapping or idle/walk/attack clips. Custom prop animation export is not included in VoxelFlow 0.2; use Blockbench's native exporter for that workflow.

1. Extract the ZIP into a resource-pack directory, or merge its resource files into an existing pack. When merging, retain the destination pack's manifest and resolve identifier collisions intentionally.
2. Create a behavior entity with the same identifier as the client entity, by default `voxelflow:atlas_robot`. Configure health, collision, movement, navigation, targeting, attack behavior, and spawn rules appropriate to your game.
3. Enable the resource and behavior packs in a test world. Check Minecraft's content log and verify scale, texture, limb rotations, animation timing, and state transitions in that version.
4. Adjust collision and attack timing to the generated proportions. A tall model does not automatically set gameplay collision or damage timing.

The controller starts at idle, walks when `query.modified_move_speed > 0.05`, and enters attack on `query.is_delayed_attacking`. Microsoft's [query documentation](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_is_delayed_attacking?view=minecraft-bedrock-stable) describes the delayed-attack state. A matching behavior must drive it; this query is not a generic attack trigger for every mob. For a custom entity, verify that behavior or replace both controller attack conditions with your own synchronized property. The punch remains directly previewable in Blockbench regardless of behavior integration. Attack returns to idle when its animation finishes.

The generated client entity maps all three clips and the controller to consistent identifiers. The render controller uses `entity_alphatest` and the current atlas. Cyan eyes are bright texture colors; there is no emissive shader. The sample manifest targets Bedrock 1.20+; per-face UV rotation raises the geometry/minimum version to 1.21.0. These are format declarations, not evidence of runtime testing.

Export supports cubes, per-face UVs, one PNG texture, a mapped humanoid hierarchy, and numeric linear/step rotation/position/scale keyframes. The validator blocks unsupported scene features rather than silently dropping them. The geometry serializer converts Blockbench's internal coordinates to Bedrock coordinates, while native animation transform values already follow the Bedrock animation convention.

The quality gates check structural correctness, finite transforms, references, texture bytes, UV bounds, expected clips, and loop closure. They do not execute Minecraft, evaluate all Molang, validate gameplay behavior, or certify every possible engine schema. Every report explicitly sets `engineVerified: false`.

Reference formats: [Bedrock animations](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationsoverview?view=minecraft-bedrock-stable), [animation controllers](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable).
