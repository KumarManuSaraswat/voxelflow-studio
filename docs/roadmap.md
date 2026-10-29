# Supported scope and next milestones

Version 0.1 implements the robot vertical slice: native geometry, generated and editable palette texture, articulated humanoid rig, three real clips, quality gates, MCP approvals and retries, Undo, and resource-asset export. It also includes speed/strength controls, conservative imported bone mapping, and an artist-facing workflow/history.

The current creative brief is a structured robot specification with height/build/detail/colors and clip controls. There is no local free-text parser or hidden model endpoint. Connected ChatGPT/Codex interprets language into that specification. Quadruped/custom characters are explicitly unavailable rather than selectable nonfunctional presets.

## Next artist milestones

1. Test with more imported humanoids and add a joint-placement preview; currently mapping requires an existing appropriate hierarchy and does not reposition joints.
2. Add a second geometry preset, more distinctive armor variants, editable palette regions, and richer pixel shading.
3. Add a live nonmutating pose preview before animation replacement. Currently approval shows a textual change summary; native animation preview follows application.
4. Add run, jump, hurt, and death, with transition and foot-contact checks. Existing clips use a simple deterministic gait and punch, not physics or inverse kinematics.
5. Add broader platform testing. Windows Blockbench 5.2.2 is verified; macOS/Linux and the web editor are not.

## Product expansion

Behavior-pack generation and Minecraft content-log integration come before a “playable mob” claim. Later work can add quadrupeds, custom sequences, animation blending, GeckoLib export, and more game adapters. Reference-image or AI texture services would require explicit provider credentials and consent; none are present now.

MCP follow-up work includes account-level Codex/ChatGPT demo verification, a properly authenticated HTTPS deployment if needed, and persisted operation history with careful project/session identity. Version 0.1 intentionally keeps operation IDs in one bounded editor session; it does not claim retries survive plugin reloads.
